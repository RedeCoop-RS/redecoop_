import { UserRole } from "@/User/entities/user.entity";

export class UserLoggedDto {
  email: string;
  sub: number;
  role: UserRole;
  /** Presente no JWT após exchange-token (id do utilizador na tabela user). */
  userId?: number;
}
