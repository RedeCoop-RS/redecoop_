import { Expose } from 'class-transformer';
import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

/**
 * Tabela `caf_data` — colunas alinhadas ao dump SQL (snake_case no MySQL).
 * Apenas `cooperative_id` como coluna escalar (evita conflito ManyToOne + @Column no mesmo FK).
 */
@Entity('caf_data')
export class CafData {
  @Expose() @PrimaryGeneratedColumn() id: number;

  @Expose()
  @Column({ name: 'cooperative_id', type: 'int', nullable: true })
  cooperativeId: number | null;

  @Expose() @Column() cnpj: string;

  @Expose() @Column({ nullable: true, name: 'cafe_uuid' }) cafUuid: string | null;

  @Expose() @Column({ name: 'numero_caf', nullable: true }) numeroCaf: string | null;
  @Expose() @Column({ name: 'razao_social', nullable: true }) razaoSocial: string | null;
  @Expose() @Column({ nullable: true }) situacao: string | null;
  @Expose() @Column({ name: 'tipo_pessoa_juridica', nullable: true }) tipoPessoaJuridica: string | null;
  @Expose() @Column({ nullable: true }) municipio: string | null;
  @Expose() @Column({ nullable: true }) uf: string | null;
  @Expose() @Column({ name: 'data_inscricao', nullable: true }) dataInscricao: string | null;
  @Expose() @Column({ name: 'data_validade', nullable: true }) dataValidade: string | null;
  @Expose() @Column({ name: 'ultima_atualizacao', nullable: true }) ultimaAtualizacao: string | null;
  @Expose() @Column({ name: 'representante_legal', nullable: true }) representanteLegal: string | null;

  @Expose() @Column({ name: 'total_com_caf', type: 'int', default: 0 }) totalComCaf: number;
  @Expose() @Column({ name: 'total_sem_caf', type: 'int', default: 0 }) totalSemCaf: number;
  @Expose() @Column({ name: 'percentual_com_caf', type: 'decimal', precision: 5, scale: 2, default: 0 })
  percentualComCaf: string | number;

  @Expose() @Column({ type: 'int', default: 0 }) masculino: number;
  @Expose() @Column({ type: 'int', default: 0 }) feminino: number;

  @Expose() @Column({ name: 'data_envio_composicao', nullable: true }) dataEnvioComposicao: string | null;

  @Expose() @Column({ type: 'json', nullable: true }) categorias: unknown;
  @Expose() @Column({ type: 'json', nullable: true }) atividades: unknown;
  @Expose() @Column({ name: 'municipios_socios', type: 'json', nullable: true }) municipiosSocios: unknown;

  @Expose() @Column({ name: 'composicao_societaria', type: 'json', nullable: true }) composicaoSocietaria: unknown;

  @Expose() @Column({ name: 'consulted_at', type: 'timestamp' }) consultedAt: Date;
  @Expose() @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
}
