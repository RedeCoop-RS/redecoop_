import { Cooperative } from "../../../cooperative/entities/cooperative.entity";
import { User, UserRole } from "../../../User/entities/user.entity";
import { DataSource } from "typeorm";
import { Seeder, SeederFactoryManager } from "typeorm-extension";
import * as bcrypt from 'bcrypt';


export default class UserSeeder implements Seeder {

    public async run(dataSource: DataSource, factoryManager: SeederFactoryManager): Promise<any> {
        const userRepository = dataSource.getRepository(User);
        const cooperativeRepository = dataSource.getRepository(Cooperative);

        console.log('Criando usuario admin...');
        const newUser = userRepository.create({
            username: "admin@redecoop.com.br",
            password: await bcrypt.hash("W&bf$I#5f6pe", 10),
            role: UserRole.ADMIN,
        });

        const user = await userRepository.save(newUser);

        const newCooperative = cooperativeRepository.create({
            companyName: "Redecoop",
            email: "admin@redecoop.com.br",
            active: true,
            user
        })

        await cooperativeRepository.save(newCooperative);
    }
}