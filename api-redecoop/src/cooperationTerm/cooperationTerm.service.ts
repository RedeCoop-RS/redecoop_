import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { promises as fs } from 'fs';
import { In, Repository } from 'typeorm';
import { Transactional } from 'typeorm-transactional';
import { v4 as uuidv4 } from 'uuid';
import { Cooperative } from '@/cooperative/entities/cooperative.entity';
import { UserRole } from '@/User/entities/user.entity';
import { CooperationActor } from './cooperationTerm.actor';
import {
  CalendarEntryDto,
  CapacityEntryDto,
  CooperationTermItemDto,
  CreateCooperationTermDto,
  HospitalUnitInputDto,
  InterestItemDto,
  UpdateCooperationTermDto,
} from './Dtos/cooperationTerm.dto';
import { assertCanMutate, assertCanReadModule, resolveTermAccess } from './domain/access';
import { normalizeMonths } from './domain/calendar';
import { divideQuantity } from './domain/division';
import { divisionMessage, messageToHtml, termMessage } from './domain/message';
import { asNumber } from './domain/quantity';
import { ImportedItem, ImportPreview, parseSpreadsheet, parseXlsx, summarizeImport } from './domain/spreadsheet';
import { CooperationTermAllocation } from './entities/cooperationTermAllocation.entity';
import { CooperationTerm } from './entities/cooperationTerm.entity';
import {
  CooperationTermEmailLog,
  CooperationTermRecipient,
} from './entities/cooperationTermEmailLog.entity';
import { CooperationTermHospitalUnit } from './entities/cooperationTermHospitalUnit.entity';
import { CooperationTermInterest } from './entities/cooperationTermInterest.entity';
import { CooperationTermItem } from './entities/cooperationTermItem.entity';
import { CooperationTermItemHospitalQty } from './entities/cooperationTermItemHospitalQty.entity';
import { CooperationTermSupplyMonth } from './entities/cooperationTermSupplyMonth.entity';
import {
  CooperationTermEmailKind,
  CooperationTermEmailStatus,
  CooperationTermModel,
  CooperationTermStatus,
} from './enums/cooperationTerm.enums';
import { CooperationTermExportService } from './cooperationTerm-export.service';
import { CooperationTermMailer } from './cooperationTerm-mailer';
import {
  CooperationTermDetail,
  CooperationTermSummary,
  cooperativeLabel,
  presentTerm,
} from './cooperationTerm.view';

const pairKey = (itemId: number, cooperativeId: number) => `${itemId}:${cooperativeId}`;

@Injectable()
export class CooperationTermService {
  constructor(
    @InjectRepository(CooperationTerm)
    private readonly terms: Repository<CooperationTerm>,
    @InjectRepository(CooperationTermHospitalUnit)
    private readonly hospitalUnits: Repository<CooperationTermHospitalUnit>,
    @InjectRepository(CooperationTermItem)
    private readonly items: Repository<CooperationTermItem>,
    @InjectRepository(CooperationTermItemHospitalQty)
    private readonly hospitalQtys: Repository<CooperationTermItemHospitalQty>,
    @InjectRepository(CooperationTermInterest)
    private readonly interests: Repository<CooperationTermInterest>,
    @InjectRepository(CooperationTermAllocation)
    private readonly allocations: Repository<CooperationTermAllocation>,
    @InjectRepository(CooperationTermSupplyMonth)
    private readonly supplyMonths: Repository<CooperationTermSupplyMonth>,
    @InjectRepository(CooperationTermEmailLog)
    private readonly emailLogs: Repository<CooperationTermEmailLog>,
    @InjectRepository(Cooperative)
    private readonly cooperatives: Repository<Cooperative>,
    private readonly exporter: CooperationTermExportService,
    private readonly mailer: CooperationTermMailer,
  ) {}

  async list(
    actor: CooperationActor,
    page = 1,
    limit = 20,
    search?: string,
  ): Promise<{ items: CooperationTermSummary[]; total: number; page: number; limit: number }> {
    assertCanReadModule(actor.role);
    const currentPage = Math.max(1, Number(page) || 1);
    const pageSize = Math.min(50, Math.max(1, Number(limit) || 20));
    const qb = this.terms
      .createQueryBuilder('term')
      .orderBy('term.updatedAt', 'DESC')
      .addOrderBy('term.id', 'DESC');

    if (actor.role === UserRole.COOPERATIVE) {
      qb.andWhere(
        `(term.status = :signed OR (
            term.status = :draft
            AND term.division_released = 1
            AND EXISTS (
              SELECT 1 FROM cooperation_term_interest interest
              INNER JOIN cooperation_term_item item ON item.id = interest.item_id
              WHERE item.term_id = term.id AND interest.cooperative_id = :cooperativeId
            )
          ))`,
        {
          signed: CooperationTermStatus.SIGNED,
          draft: CooperationTermStatus.DRAFT,
          cooperativeId: actor.cooperativeId,
        },
      );
    }

    if (search?.trim()) {
      qb.andWhere(
        '(term.name LIKE :search OR term.processNumber LIKE :search OR term.buyerInstitution LIKE :search)',
        { search: `%${search.trim()}%` },
      );
    }

    const [rows, total] = await qb
      .skip((currentPage - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();
    const counts = await this.itemCounts(rows.map((row) => row.id));

    return {
      items: rows.map((row) => ({
        id: row.id,
        familyId: row.familyId,
        version: row.version,
        name: row.name,
        processNumber: row.processNumber,
        buyerInstitution: row.buyerInstitution,
        model: row.model,
        status: row.status,
        divisionReleased: row.divisionReleased,
        signedAt: row.signedAt ? new Date(row.signedAt).toISOString() : null,
        updatedAt: row.updatedAt
          ? new Date(row.updatedAt).toISOString()
          : new Date(0).toISOString(),
        itemCount: counts.get(row.id) ?? 0,
        scope:
          actor.role === UserRole.COOPERATIVE && row.status !== CooperationTermStatus.SIGNED
            ? 'division'
            : 'full',
      })),
      total,
      page: currentPage,
      limit: pageSize,
    };
  }

  async get(actor: CooperationActor, id: number): Promise<CooperationTermDetail> {
    assertCanReadModule(actor.role);
    const term = await this.load(id);
    if (!term) throw new NotFoundException('Termo de cooperação não encontrado');
    const access = this.accessFor(actor, term);
    if (!access.canView) throw new NotFoundException('Termo de cooperação não encontrado');
    const family = await this.terms.find({
      where: { familyId: term.familyId },
      order: { version: 'DESC' },
    });
    return presentTerm(term, access, family, actor);
  }

  async create(
    actor: CooperationActor,
    dto: CreateCooperationTermDto,
  ): Promise<CooperationTermDetail> {
    assertCanMutate(actor.role);
    const id = await this.insertTerm(actor, dto);
    return this.get(actor, id);
  }

  async update(
    actor: CooperationActor,
    id: number,
    dto: UpdateCooperationTermDto,
  ): Promise<CooperationTermDetail> {
    assertCanMutate(actor.role);
    await this.persistHeader(id, dto);
    return this.get(actor, id);
  }

  async replaceHospitalUnits(
    actor: CooperationActor,
    id: number,
    units: HospitalUnitInputDto[],
  ): Promise<CooperationTermDetail> {
    assertCanMutate(actor.role);
    await this.persistHospitalUnits(id, units);
    return this.get(actor, id);
  }

  async createItem(
    actor: CooperationActor,
    id: number,
    dto: CooperationTermItemDto,
  ): Promise<CooperationTermDetail> {
    assertCanMutate(actor.role);
    await this.persistNewItem(id, dto);
    return this.get(actor, id);
  }

  async updateItem(
    actor: CooperationActor,
    id: number,
    itemId: number,
    dto: CooperationTermItemDto,
  ): Promise<CooperationTermDetail> {
    assertCanMutate(actor.role);
    await this.persistItem(id, itemId, dto);
    return this.get(actor, id);
  }

  async deleteItem(
    actor: CooperationActor,
    id: number,
    itemId: number,
  ): Promise<CooperationTermDetail> {
    assertCanMutate(actor.role);
    await this.removeItem(id, itemId);
    return this.get(actor, id);
  }

  async importItems(
    actor: CooperationActor,
    id: number,
    file: Express.Multer.File | undefined,
    replace: boolean,
  ): Promise<CooperationTermDetail> {
    assertCanMutate(actor.role);
    if (!file?.path) throw new BadRequestException('Envie um arquivo .xlsx ou .csv');
    try {
      const buffer = await fs.readFile(file.path);
      const filename = file.originalname || file.filename || '';
      const imported = filename.toLowerCase().endsWith('.xlsx')
        ? await parseXlsx(buffer)
        : parseSpreadsheet(buffer, filename);
      await this.persistImport(id, imported, replace);
    } finally {
      await fs.unlink(file.path).catch(() => undefined);
    }
    return this.get(actor, id);
  }

  async previewImport(
    actor: CooperationActor,
    id: number,
    file: Express.Multer.File | undefined,
  ): Promise<ImportPreview> {
    assertCanMutate(actor.role);
    if (!file?.path) throw new BadRequestException('Envie um arquivo .xlsx ou .csv');
    try {
      await this.requireDraft(id);
      const buffer = await fs.readFile(file.path);
      const filename = file.originalname || file.filename || 'planilha';
      const imported = filename.toLowerCase().endsWith('.xlsx')
        ? await parseXlsx(buffer)
        : parseSpreadsheet(buffer, filename);
      return summarizeImport(filename, imported);
    } finally {
      await fs.unlink(file.path).catch(() => undefined);
    }
  }

  async setInterests(
    actor: CooperationActor,
    id: number,
    entries: InterestItemDto[],
  ): Promise<CooperationTermDetail> {
    assertCanMutate(actor.role);
    await this.persistInterests(id, entries);
    return this.get(actor, id);
  }

  async setCapacities(
    actor: CooperationActor,
    id: number,
    entries: CapacityEntryDto[],
  ): Promise<CooperationTermDetail> {
    assertCanMutate(actor.role);
    await this.persistCapacities(id, entries);
    return this.get(actor, id);
  }

  async recalculate(actor: CooperationActor, id: number): Promise<CooperationTermDetail> {
    assertCanMutate(actor.role);
    await this.persistRecalculate(id);
    return this.get(actor, id);
  }

  async setDivisionReleased(
    actor: CooperationActor,
    id: number,
    released: boolean,
  ): Promise<CooperationTermDetail> {
    assertCanMutate(actor.role);
    await this.persistRelease(id, released);
    return this.get(actor, id);
  }

  async setCalendar(
    actor: CooperationActor,
    id: number,
    entries: CalendarEntryDto[],
  ): Promise<CooperationTermDetail> {
    assertCanMutate(actor.role);
    await this.persistCalendar(id, entries);
    return this.get(actor, id);
  }

  async sign(actor: CooperationActor, id: number): Promise<CooperationTermDetail> {
    assertCanMutate(actor.role);
    await this.persistSignature(actor, id);
    return this.get(actor, id);
  }

  async newVersion(actor: CooperationActor, id: number): Promise<CooperationTermDetail> {
    assertCanMutate(actor.role);
    const copyId = await this.persistVersion(actor, id);
    return this.get(actor, copyId);
  }

  async send(actor: CooperationActor, id: number, confirm: boolean, message?: string) {
    assertCanMutate(actor.role);
    if (confirm !== true) {
      throw new BadRequestException('Confirme o envio do termo para continuar.');
    }
    return this.deliver(actor, id, message);
  }

  async exportExcel(actor: CooperationActor, id: number) {
    const term = await this.loadReadable(actor, id);
    return this.exporter.excel(term);
  }

  async exportPdf(actor: CooperationActor, id: number) {
    const term = await this.loadReadable(actor, id);
    return this.exporter.pdf(term);
  }

  /** Planilha de divisão (sem calendário), usada pelas cooperativas no projeto de venda. */
  async exportDivision(actor: CooperationActor, id: number, format: 'pdf' | 'excel') {
    assertCanMutate(actor.role);
    const term = await this.load(id);
    if (!term) throw new NotFoundException('Termo de cooperação não encontrado');
    return format === 'pdf'
      ? this.exporter.pdf(term, 'division')
      : this.exporter.excel(term, 'division');
  }

  async sendDivision(actor: CooperationActor, id: number, confirm: boolean, message?: string) {
    assertCanMutate(actor.role);
    if (confirm !== true) {
      throw new BadRequestException('Confirme o envio da planilha de divisão para continuar.');
    }
    return this.deliverDivision(actor, id, message);
  }

  private accessFor(actor: CooperationActor, term: CooperationTerm) {
    return resolveTermAccess({
      role: actor.role,
      cooperativeId: actor.cooperativeId,
      status: term.status,
      divisionReleased: term.divisionReleased,
      participantCooperativeIds: participantIds(term),
    });
  }

  private async loadReadable(actor: CooperationActor, id: number): Promise<CooperationTerm> {
    assertCanReadModule(actor.role);
    const term = await this.load(id);
    if (!term) throw new NotFoundException('Termo de cooperação não encontrado');
    const access = this.accessFor(actor, term);
    if (!access.canView) throw new NotFoundException('Termo de cooperação não encontrado');
    if (!access.canDownload) {
      throw new ForbiddenException('O arquivo do termo fica disponível depois que ele é firmado.');
    }
    return term;
  }

  private load(id: number): Promise<CooperationTerm | null> {
    return this.terms.findOne({
      where: { id },
      relations: {
        hospitalUnits: true,
        items: {
          hospitalQuantities: true,
          interests: { cooperative: true },
          allocations: { cooperative: true },
          supplyMonths: true,
        },
        emailLogs: true,
      },
    });
  }

  @Transactional()
  private async insertTerm(
    actor: CooperationActor,
    dto: CreateCooperationTermDto,
  ): Promise<number> {
    const term = await this.terms.save(
      this.terms.create({
        familyId: uuidv4(),
        version: 1,
        name: dto.name.trim(),
        processNumber: dto.processNumber.trim(),
        buyerInstitution: dto.buyerInstitution.trim(),
        buyerEmail: cleanEmail(dto.buyerEmail),
        model: dto.model,
        status: CooperationTermStatus.DRAFT,
        divisionReleased: false,
        createdByUserId: actor.userId,
      }),
    );
    return term.id;
  }

  @Transactional()
  private async persistHeader(id: number, dto: UpdateCooperationTermDto): Promise<void> {
    const term = await this.requireDraft(id);
    if (dto.name !== undefined) term.name = dto.name.trim();
    if (dto.processNumber !== undefined) term.processNumber = dto.processNumber.trim();
    if (dto.buyerInstitution !== undefined) term.buyerInstitution = dto.buyerInstitution.trim();
    if (dto.buyerEmail !== undefined) term.buyerEmail = cleanEmail(dto.buyerEmail);
    if (dto.model !== undefined) term.model = dto.model;
    await this.terms.save(term);
  }

  @Transactional()
  private async persistHospitalUnits(id: number, units: HospitalUnitInputDto[]): Promise<void> {
    const term = await this.requireDraft(id);
    if (term.model !== CooperationTermModel.GHC) {
      throw new BadRequestException('Unidades hospitalares existem apenas no modelo GHC.');
    }
    const names = units.map((unit) => unit.name.trim()).filter(Boolean);
    const folded = names.map(fold);
    if (new Set(folded).size !== folded.length) {
      throw new BadRequestException('Há unidades hospitalares com o mesmo nome.');
    }
    const kept = new Set<number>();
    for (let index = 0; index < units.length; index++) {
      const input = units[index];
      const name = input.name.trim();
      if (!name) continue;
      if (input.id) {
        const current = (term.hospitalUnits ?? []).find((unit) => unit.id === input.id);
        if (!current)
          throw new BadRequestException('Unidade hospitalar não encontrada neste termo.');
        current.name = name;
        current.position = index + 1;
        await this.hospitalUnits.save(current);
        kept.add(current.id);
      } else {
        const created = await this.hospitalUnits.save(
          this.hospitalUnits.create({ termId: term.id, name, position: index + 1 }),
        );
        kept.add(created.id);
      }
    }
    const removed = (term.hospitalUnits ?? []).filter((unit) => !kept.has(unit.id));
    const removedIds = new Set(removed.map((unit) => unit.id));
    const affectedItemIds = new Set<number>();
    for (const item of term.items ?? []) {
      if ((item.hospitalQuantities ?? []).some((qty) => removedIds.has(qty.hospitalUnitId))) {
        affectedItemIds.add(item.id);
      }
    }
    if (removed.length) await this.hospitalUnits.delete(removed.map((unit) => unit.id));

    const fresh = await this.requireDraft(id);
    for (const item of fresh.items ?? []) {
      if (item.hospitalQuantities?.length || affectedItemIds.has(item.id)) {
        item.estimatedQuantity = round3(
          (item.hospitalQuantities ?? []).reduce((sum, qty) => sum + asNumber(qty.quantity), 0),
        );
        await this.items.update(item.id, { estimatedQuantity: item.estimatedQuantity });
      }
    }
    await this.rebuildAllocations(fresh);
    await this.touch(id);
  }

  @Transactional()
  private async persistNewItem(id: number, dto: CooperationTermItemDto): Promise<void> {
    const term = await this.requireDraft(id);
    const quantity = this.quantityFor(term.model, dto);
    const price = resolvePrices(quantity, dto.unitPrice, dto.totalPrice);
    const position = (term.items ?? []).reduce((max, item) => Math.max(max, item.position), 0) + 1;
    const itemNumber = dto.itemNumber ?? nextItemNumber(term.items ?? []);
    assertFreeItemNumber(term.items ?? [], itemNumber);
    const item = await this.items.save(
      this.items.create({
        termId: term.id,
        position,
        itemNumber,
        description: dto.description.trim(),
        unit: dto.unit.trim(),
        estimatedQuantity: quantity,
        unitPrice: price.unitPrice,
        totalPrice: price.totalPrice,
      }),
    );
    await this.writeHospitalQuantities(term, item.id, dto.hospitalQuantities);
    const fresh = await this.requireDraft(id);
    await this.rebuildAllocations(fresh);
    await this.touch(id);
  }

  @Transactional()
  private async persistItem(
    id: number,
    itemId: number,
    dto: CooperationTermItemDto,
  ): Promise<void> {
    const term = await this.requireDraft(id);
    const item = (term.items ?? []).find((current) => current.id === itemId);
    if (!item) throw new NotFoundException('Item não encontrado');
    const quantity = this.quantityFor(term.model, dto);
    const price = resolvePrices(quantity, dto.unitPrice, dto.totalPrice);
    if (dto.itemNumber !== undefined && dto.itemNumber !== null) {
      assertFreeItemNumber(term.items ?? [], dto.itemNumber, item.id);
      item.itemNumber = dto.itemNumber;
    }
    item.description = dto.description.trim();
    item.unit = dto.unit.trim();
    item.estimatedQuantity = quantity;
    item.unitPrice = price.unitPrice;
    item.totalPrice = price.totalPrice;
    await this.items.update(item.id, {
      itemNumber: item.itemNumber,
      description: item.description,
      unit: item.unit,
      estimatedQuantity: item.estimatedQuantity,
      unitPrice: item.unitPrice,
      totalPrice: item.totalPrice,
    });
    await this.writeHospitalQuantities(term, item.id, dto.hospitalQuantities);
    if (term.model === CooperationTermModel.GHC && dto.hospitalQuantities?.length) {
      item.estimatedQuantity = round3(
        dto.hospitalQuantities.reduce((sum, qty) => sum + qty.quantity, 0),
      );
    }
    await this.rebuildAllocations(term);
    await this.touch(id);
  }

  @Transactional()
  private async removeItem(id: number, itemId: number): Promise<void> {
    const term = await this.requireDraft(id);
    const item = (term.items ?? []).find((current) => current.id === itemId);
    if (!item) throw new NotFoundException('Item não encontrado');
    await this.items.delete(itemId);
    term.items = (term.items ?? []).filter((current) => current.id !== itemId);
    for (let index = 0; index < term.items.length; index++) {
      term.items[index].position = index + 1;
      await this.items.update(term.items[index].id, { position: index + 1 });
    }
    await this.rebuildAllocations(term);
    await this.touch(id);
  }

  @Transactional()
  private async persistImport(
    id: number,
    imported: ImportedItem[],
    replace: boolean,
  ): Promise<void> {
    const term = await this.requireDraft(id);
    if (replace && term.items?.length) {
      await this.items.delete(term.items.map((item) => item.id));
      term.items = [];
    }
    let position = (term.items ?? []).reduce((max, item) => Math.max(max, item.position), 0);
    const numbered: Pick<CooperationTermItem, 'id' | 'itemNumber' | 'position'>[] = [
      ...(term.items ?? []),
    ];
    for (const row of imported) {
      if (row.estimatedQuantity === null) {
        throw new BadRequestException(`O item "${row.description}" está sem quantidade.`);
      }
      position += 1;
      const itemNumber = row.itemNumber ?? nextItemNumber(numbered);
      assertFreeItemNumber(numbered, itemNumber);
      numbered.push({ id: 0, itemNumber, position });
      const hospitalQuantities = await this.hospitalQuantitiesForImport(term, row);
      const estimated =
        term.model === CooperationTermModel.GHC && hospitalQuantities.length
          ? round3(hospitalQuantities.reduce((sum, qty) => sum + qty.quantity, 0))
          : row.estimatedQuantity;
      const price = resolvePrices(estimated, row.unitPrice, row.totalPrice);
      const item = await this.items.save(
        this.items.create({
          termId: term.id,
          position,
          itemNumber,
          description: row.description.trim(),
          unit: row.unit.trim() || 'KG',
          estimatedQuantity: estimated,
          unitPrice: price.unitPrice,
          totalPrice: price.totalPrice,
        }),
      );
      if (hospitalQuantities.length) {
        await this.hospitalQtys.save(
          hospitalQuantities.map((qty) =>
            this.hospitalQtys.create({
              itemId: item.id,
              hospitalUnitId: qty.hospitalUnitId,
              quantity: qty.quantity,
            }),
          ),
        );
      }
    }
    const fresh = await this.requireDraft(id);
    await this.rebuildAllocations(fresh);
    await this.touch(id);
  }

  @Transactional()
  private async persistInterests(id: number, entries: InterestItemDto[]): Promise<void> {
    const term = await this.requireDraft(id);
    const itemIds = new Set((term.items ?? []).map((item) => item.id));
    const seen = new Set<number>();
    const cooperativeIds = new Set<number>();
    for (const entry of entries) {
      if (!itemIds.has(entry.itemId))
        throw new BadRequestException('Item não pertence a este termo.');
      if (seen.has(entry.itemId))
        throw new BadRequestException('Item repetido na lista de interesse.');
      seen.add(entry.itemId);
      entry.cooperativeIds.forEach((cooperativeId) => cooperativeIds.add(cooperativeId));
    }
    const cooperatives = cooperativeIds.size
      ? await this.cooperatives.findBy({ id: In([...cooperativeIds]) })
      : [];
    if (cooperatives.length !== cooperativeIds.size) {
      throw new BadRequestException('Uma ou mais cooperativas não foram encontradas.');
    }
    const byId = new Map(cooperatives.map((cooperative) => [cooperative.id, cooperative]));
    if (itemIds.size) {
      await this.interests
        .createQueryBuilder()
        .delete()
        .from(CooperationTermInterest)
        .where('item_id IN (:...ids)', { ids: [...itemIds] })
        .execute();
    }
    const rows: CooperationTermInterest[] = [];
    for (const entry of entries) {
      for (const cooperativeId of [...new Set(entry.cooperativeIds)]) {
        rows.push(
          this.interests.create({
            itemId: entry.itemId,
            cooperativeId,
            cooperative: byId.get(cooperativeId),
          }),
        );
      }
    }
    if (rows.length) await this.interests.save(rows);
    for (const item of term.items ?? []) {
      item.interests = rows.filter((row) => row.itemId === item.id);
    }
    await this.rebuildAllocations(term);
    await this.touch(id);
  }

  @Transactional()
  private async persistCapacities(id: number, entries: CapacityEntryDto[]): Promise<void> {
    const term = await this.requireDraft(id);
    const seen = new Set<string>();
    for (const entry of entries) {
      const key = pairKey(entry.itemId, entry.cooperativeId);
      if (seen.has(key))
        throw new BadRequestException('Capacidade repetida para a mesma cooperativa e item.');
      seen.add(key);
      const item = (term.items ?? []).find((current) => current.id === entry.itemId);
      const allocation = item?.allocations?.find(
        (current) => current.cooperativeId === entry.cooperativeId,
      );
      if (!allocation) {
        throw new BadRequestException(
          'Informe a capacidade apenas de cooperativas que estão cotando o item.',
        );
      }
      allocation.maxCapacity = entry.maxCapacity === undefined ? null : entry.maxCapacity;
    }
    await this.rebuildAllocations(term);
    await this.touch(id);
  }

  @Transactional()
  private async persistRecalculate(id: number): Promise<void> {
    const term = await this.requireDraft(id);
    await this.rebuildAllocations(term);
    await this.touch(id);
  }

  @Transactional()
  private async persistRelease(id: number, released: boolean): Promise<void> {
    const term = await this.requireDraft(id);
    term.divisionReleased = released;
    await this.terms.save(term);
  }

  @Transactional()
  private async persistCalendar(id: number, entries: CalendarEntryDto[]): Promise<void> {
    const term = await this.requireDraft(id);
    const allowed = new Set<string>();
    for (const item of term.items ?? []) {
      for (const interest of item.interests ?? [])
        allowed.add(pairKey(item.id, interest.cooperativeId));
    }
    const wanted = new Map<string, number[]>();
    for (const entry of entries) {
      const key = pairKey(entry.itemId, entry.cooperativeId);
      if (!allowed.has(key)) {
        throw new BadRequestException(
          'O calendário só pode ser marcado para cooperativas interessadas no item.',
        );
      }
      if (wanted.has(key))
        throw new BadRequestException('Calendário repetido para a mesma cooperativa e item.');
      if (entry.months.some((month) => !Number.isInteger(month) || month < 1 || month > 12)) {
        throw new BadRequestException('Mês inválido. Use valores de 1 (janeiro) a 12 (dezembro).');
      }
      wanted.set(key, normalizeMonths(entry.months));
    }
    const itemIds = [...(term.items ?? []).map((item) => item.id)];
    if (itemIds.length) {
      await this.supplyMonths
        .createQueryBuilder()
        .delete()
        .from(CooperationTermSupplyMonth)
        .where('item_id IN (:...ids)', { ids: itemIds })
        .execute();
    }
    const rows: CooperationTermSupplyMonth[] = [];
    for (const item of term.items ?? []) {
      for (const interest of item.interests ?? []) {
        rows.push(
          this.supplyMonths.create({
            itemId: item.id,
            cooperativeId: interest.cooperativeId,
            months: wanted.get(pairKey(item.id, interest.cooperativeId)) ?? [],
          }),
        );
      }
    }
    if (rows.length) await this.supplyMonths.save(rows);
    await this.touch(id);
  }

  @Transactional()
  private async persistSignature(actor: CooperationActor, id: number): Promise<void> {
    const term = await this.requireDraft(id);
    if (!(term.items ?? []).length)
      throw new BadRequestException('Inclua ao menos um item antes de firmar.');
    term.status = CooperationTermStatus.SIGNED;
    term.signedAt = new Date();
    term.signedByUserId = actor.userId;
    await this.terms.save(term);
  }

  @Transactional()
  private async persistVersion(actor: CooperationActor, id: number): Promise<number> {
    const source = await this.load(id);
    if (!source) throw new NotFoundException('Termo de cooperação não encontrado');
    if (source.status !== CooperationTermStatus.SIGNED) {
      throw new BadRequestException('Somente um termo firmado gera uma nova versão.');
    }
    const openDraft = await this.terms.findOne({
      where: { familyId: source.familyId, status: CooperationTermStatus.DRAFT },
    });
    if (openDraft) {
      throw new ConflictException(
        `Já existe um rascunho (versão ${openDraft.version}). Edite essa versão em vez de criar outra.`,
      );
    }
    const latest = await this.terms.find({
      where: { familyId: source.familyId },
      order: { version: 'DESC' },
      take: 1,
    });
    const copy = await this.terms.save(
      this.terms.create({
        familyId: source.familyId,
        version: (latest[0]?.version ?? source.version) + 1,
        name: source.name,
        processNumber: source.processNumber,
        buyerInstitution: source.buyerInstitution,
        buyerEmail: source.buyerEmail,
        model: source.model,
        status: CooperationTermStatus.DRAFT,
        divisionReleased: false,
        signedAt: null,
        signedByUserId: null,
        createdByUserId: actor.userId,
        predecessorId: source.id,
      }),
    );
    const unitMap = new Map<number, number>();
    for (const unit of [...(source.hospitalUnits ?? [])].sort((a, b) => a.position - b.position)) {
      const created = await this.hospitalUnits.save(
        this.hospitalUnits.create({ termId: copy.id, name: unit.name, position: unit.position }),
      );
      unitMap.set(unit.id, created.id);
    }
    for (const item of [...(source.items ?? [])].sort((a, b) => a.position - b.position)) {
      const created = await this.items.save(
        this.items.create({
          termId: copy.id,
          position: item.position,
          itemNumber: item.itemNumber,
          description: item.description,
          unit: item.unit,
          estimatedQuantity: asNumber(item.estimatedQuantity),
          unitPrice: item.unitPrice === null ? null : asNumber(item.unitPrice),
          totalPrice: item.totalPrice === null ? null : asNumber(item.totalPrice),
        }),
      );
      if (item.hospitalQuantities?.length) {
        await this.hospitalQtys.save(
          item.hospitalQuantities.map((qty) =>
            this.hospitalQtys.create({
              itemId: created.id,
              hospitalUnitId: unitMap.get(qty.hospitalUnitId),
              quantity: asNumber(qty.quantity),
            }),
          ),
        );
      }
      if (item.interests?.length) {
        await this.interests.save(
          item.interests.map((interest) =>
            this.interests.create({ itemId: created.id, cooperativeId: interest.cooperativeId }),
          ),
        );
      }
      if (item.allocations?.length) {
        await this.allocations.save(
          item.allocations.map((allocation) =>
            this.allocations.create({
              itemId: created.id,
              cooperativeId: allocation.cooperativeId,
              quantity: asNumber(allocation.quantity),
              maxCapacity:
                allocation.maxCapacity === null ? null : asNumber(allocation.maxCapacity),
            }),
          ),
        );
      }
      if (item.supplyMonths?.length) {
        await this.supplyMonths.save(
          item.supplyMonths.map((month) =>
            this.supplyMonths.create({
              itemId: created.id,
              cooperativeId: month.cooperativeId,
              months: [...(month.months ?? [])],
            }),
          ),
        );
      }
    }
    return copy.id;
  }

  @Transactional()
  private async deliver(actor: CooperationActor, id: number, message?: string) {
    const term = await this.load(id);
    if (!term) throw new NotFoundException('Termo de cooperação não encontrado');
    if (term.status !== CooperationTermStatus.SIGNED) {
      throw new BadRequestException('Firme o termo antes de enviar.');
    }
    const { recipients, skipped } = collectRecipients(term, true);
    if (!recipients.length) {
      throw new BadRequestException(
        'Nenhum destinatário com e-mail. Confira o cadastro das cooperativas e o e-mail da instituição compradora.',
      );
    }
    const [pdf, excel] = await Promise.all([this.exporter.pdf(term), this.exporter.excel(term)]);
    return this.dispatchAndLog(actor, term, CooperationTermEmailKind.TERM, {
      recipients,
      skipped,
      subject: `Termo de Cooperação firmado — ${term.name} (Processo ${term.processNumber})`,
      html: messageToHtml(message?.trim() || termMessage(term)),
      files: [pdf, excel],
    });
  }

  @Transactional()
  private async deliverDivision(actor: CooperationActor, id: number, message?: string) {
    const term = await this.load(id);
    if (!term) throw new NotFoundException('Termo de cooperação não encontrado');
    if (!(term.items ?? []).some((item) => (item.allocations ?? []).length)) {
      throw new BadRequestException('Marque o interesse das cooperativas antes de enviar a divisão.');
    }
    const { recipients, skipped } = collectRecipients(term, false);
    if (!recipients.length) {
      throw new BadRequestException(
        'Nenhuma cooperativa participante tem e-mail cadastrado. Confira o cadastro das cooperativas.',
      );
    }
    const [pdf, excel] = await Promise.all([
      this.exporter.pdf(term, 'division'),
      this.exporter.excel(term, 'division'),
    ]);
    return this.dispatchAndLog(actor, term, CooperationTermEmailKind.DIVISION, {
      recipients,
      skipped,
      subject: `Planilha de divisão — ${term.name} (Processo ${term.processNumber})`,
      html: messageToHtml(message?.trim() || divisionMessage(term)),
      files: [pdf, excel],
    });
  }

  private async dispatchAndLog(
    actor: CooperationActor,
    term: CooperationTerm,
    kind: CooperationTermEmailKind,
    input: {
      recipients: CooperationTermRecipient[];
      skipped: { name: string; reason: string }[];
      subject: string;
      html: string;
      files: { filename: string; mimeType: string; contentBase64: string }[];
    },
  ) {
    const result = await this.mailer.dispatch({
      recipients: input.recipients,
      subject: input.subject,
      html: input.html,
      attachments: input.files.map((file) => ({
        filename: file.filename,
        content: Buffer.from(file.contentBase64, 'base64'),
        contentType: file.mimeType,
      })),
    });
    await this.emailLogs.save(
      this.emailLogs.create({
        termId: term.id,
        kind,
        sentByUserId: actor.userId,
        status: result.sent ? CooperationTermEmailStatus.SENT : CooperationTermEmailStatus.SKIPPED,
        recipients: input.recipients,
        detail: result.detail,
      }),
    );
    return {
      sent: result.sent,
      detail: result.detail,
      recipients: input.recipients,
      results: result.results,
      skipped: input.skipped,
    };
  }

  private async rebuildAllocations(term: CooperationTerm): Promise<void> {
    const itemIds = (term.items ?? []).map((item) => item.id);
    if (!itemIds.length) return;
    const caps = new Map<string, number | null>();
    for (const item of term.items ?? []) {
      for (const allocation of item.allocations ?? []) {
        caps.set(
          pairKey(item.id, allocation.cooperativeId),
          allocation.maxCapacity === null || allocation.maxCapacity === undefined
            ? null
            : asNumber(allocation.maxCapacity),
        );
      }
    }
    await this.allocations
      .createQueryBuilder()
      .delete()
      .from(CooperationTermAllocation)
      .where('item_id IN (:...ids)', { ids: itemIds })
      .execute();

    const rows: CooperationTermAllocation[] = [];
    for (const item of term.items ?? []) {
      const participants = [...(item.interests ?? [])]
        .map((interest) => ({
          id: interest.cooperativeId,
          name: cooperativeLabel(interest.cooperative, interest.cooperativeId),
          maxCapacity: caps.has(pairKey(item.id, interest.cooperativeId))
            ? caps.get(pairKey(item.id, interest.cooperativeId))
            : null,
        }))
        .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR') || a.id - b.id);
      const result = divideQuantity(
        asNumber(item.estimatedQuantity),
        participants.map((participant) => ({
          id: participant.id,
          maxCapacity: participant.maxCapacity ?? null,
        })),
      );
      for (const allocation of result.allocations) {
        const participant = participants.find((current) => current.id === allocation.id);
        rows.push(
          this.allocations.create({
            itemId: item.id,
            cooperativeId: allocation.id,
            quantity: allocation.quantity,
            maxCapacity: participant?.maxCapacity ?? null,
          }),
        );
      }
    }
    if (rows.length) await this.allocations.save(rows);

    const allowed = new Set<string>();
    for (const item of term.items ?? []) {
      for (const interest of item.interests ?? [])
        allowed.add(pairKey(item.id, interest.cooperativeId));
    }
    const months = await this.supplyMonths
      .createQueryBuilder('month')
      .where('month.item_id IN (:...ids)', { ids: itemIds })
      .getMany();
    const stale = months.filter(
      (month) => !allowed.has(pairKey(month.itemId, month.cooperativeId)),
    );
    if (stale.length) await this.supplyMonths.delete(stale.map((month) => month.id));
  }

  private quantityFor(model: CooperationTermModel, dto: CooperationTermItemDto): number {
    if (model === CooperationTermModel.GHC && dto.hospitalQuantities?.length) {
      return round3(dto.hospitalQuantities.reduce((sum, qty) => sum + qty.quantity, 0));
    }
    if (dto.estimatedQuantity === undefined || dto.estimatedQuantity === null) {
      throw new BadRequestException('Informe a quantidade estimada do item.');
    }
    return dto.estimatedQuantity;
  }

  private async writeHospitalQuantities(
    term: CooperationTerm,
    itemId: number,
    quantities: CooperationTermItemDto['hospitalQuantities'],
  ): Promise<void> {
    if (term.model !== CooperationTermModel.GHC) {
      await this.hospitalQtys.delete({ itemId });
      return;
    }
    if (!quantities) return;
    const allowed = new Set((term.hospitalUnits ?? []).map((unit) => unit.id));
    if (quantities.some((qty) => !allowed.has(qty.hospitalUnitId))) {
      throw new BadRequestException('Unidade hospitalar inválida para este termo.');
    }
    await this.hospitalQtys.delete({ itemId });
    if (!quantities.length) return;
    await this.hospitalQtys.save(
      quantities.map((qty) =>
        this.hospitalQtys.create({
          itemId,
          hospitalUnitId: qty.hospitalUnitId,
          quantity: qty.quantity,
        }),
      ),
    );
    const estimatedQuantity = round3(quantities.reduce((sum, qty) => sum + qty.quantity, 0));
    await this.items.update(itemId, { estimatedQuantity });
  }

  private async hospitalQuantitiesForImport(
    term: CooperationTerm,
    row: ImportedItem,
  ): Promise<{ hospitalUnitId: number; quantity: number }[]> {
    if (term.model !== CooperationTermModel.GHC || !row.hospitalQuantities.length) return [];
    const known = new Map((term.hospitalUnits ?? []).map((unit) => [fold(unit.name), unit]));
    let position = (term.hospitalUnits ?? []).reduce(
      (max, unit) => Math.max(max, unit.position),
      0,
    );
    const result: { hospitalUnitId: number; quantity: number }[] = [];
    for (const entry of row.hospitalQuantities) {
      let unit = known.get(fold(entry.hospitalUnitName));
      if (!unit) {
        position += 1;
        unit = await this.hospitalUnits.save(
          this.hospitalUnits.create({
            termId: term.id,
            name: entry.hospitalUnitName.trim(),
            position,
          }),
        );
        term.hospitalUnits = [...(term.hospitalUnits ?? []), unit];
        known.set(fold(unit.name), unit);
      }
      result.push({ hospitalUnitId: unit.id, quantity: entry.quantity });
    }
    return result;
  }

  private async requireDraft(id: number): Promise<CooperationTerm> {
    const term = await this.load(id);
    if (!term) throw new NotFoundException('Termo de cooperação não encontrado');
    if (term.status !== CooperationTermStatus.DRAFT) {
      throw new BadRequestException(
        'Termo firmado é somente leitura. Gere uma nova versão para editar.',
      );
    }
    return term;
  }

  private touch(id: number) {
    return this.terms.update(id, { updatedAt: new Date() });
  }

  private async itemCounts(ids: number[]): Promise<Map<number, number>> {
    const counts = new Map<number, number>();
    if (!ids.length) return counts;
    const rows = await this.items
      .createQueryBuilder('item')
      .select('item.term_id', 'termId')
      .addSelect('COUNT(*)', 'total')
      .where('item.term_id IN (:...ids)', { ids })
      .groupBy('item.term_id')
      .getRawMany<{ termId: string | number; total: string | number }>();
    rows.forEach((row) => {
      const termId = Number(row.termId ?? (row as { term_id?: number }).term_id);
      const total = Number(row.total);
      if (termId) counts.set(termId, total);
    });
    return counts;
  }
}

function participantIds(term: CooperationTerm): number[] {
  const ids = new Set<number>();
  for (const item of term.items ?? []) {
    for (const interest of item.interests ?? []) ids.add(interest.cooperativeId);
  }
  return [...ids];
}

function collectRecipients(
  term: CooperationTerm,
  includeBuyer: boolean,
): {
  recipients: CooperationTermRecipient[];
  skipped: { name: string; reason: string }[];
} {
  const recipients: CooperationTermRecipient[] = [];
  const skipped: { name: string; reason: string }[] = [];
  const seen = new Set<number>();
  for (const item of term.items ?? []) {
    for (const interest of item.interests ?? []) {
      if (seen.has(interest.cooperativeId)) continue;
      seen.add(interest.cooperativeId);
      const name = cooperativeLabel(interest.cooperative, interest.cooperativeId);
      const email = interest.cooperative?.email?.trim();
      if (!email) skipped.push({ name, reason: 'Cooperativa sem e-mail' });
      else recipients.push({ email, name, kind: 'cooperative' });
    }
  }
  if (!includeBuyer) return { recipients, skipped };
  if (term.buyerEmail?.trim()) {
    recipients.push({ email: term.buyerEmail.trim(), name: term.buyerInstitution, kind: 'buyer' });
  } else {
    skipped.push({ name: term.buyerInstitution, reason: 'Instituição sem e-mail' });
  }
  return { recipients, skipped };
}

type NumberedItem = Pick<CooperationTermItem, 'id' | 'itemNumber' | 'position'>;

function nextItemNumber(items: NumberedItem[]): number {
  return items.reduce((max, item) => Math.max(max, item.itemNumber ?? item.position), 0) + 1;
}

function assertFreeItemNumber(items: NumberedItem[], itemNumber: number, exceptId?: number): void {
  const taken = items.some(
    (item) => item.id !== exceptId && (item.itemNumber ?? item.position) === itemNumber,
  );
  if (taken) throw new BadRequestException(`Já existe o item nº ${itemNumber} neste termo.`);
}

function resolvePrices(
  quantity: number,
  unitPrice?: number | null,
  totalPrice?: number | null,
): { unitPrice: number | null; totalPrice: number | null } {
  if (unitPrice === null || unitPrice === undefined) {
    return { unitPrice: null, totalPrice: totalPrice ?? null };
  }
  return { unitPrice, totalPrice: round2(quantity * unitPrice) };
}

function cleanEmail(value?: string | null): string | null {
  const email = value?.trim();
  return email ? email : null;
}

function round3(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function fold(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}
