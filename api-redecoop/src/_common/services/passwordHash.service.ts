import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';



@Injectable()
export class HashService {

    async hashPassword(password: string): Promise<string> {
        const saltRounds = 10;
        return await bcrypt.hash(password, saltRounds);
    }

    async validatePassword(password: string, hashedPassword: string): Promise<boolean> {
        return await bcrypt.compare(password, hashedPassword);
    }

}
