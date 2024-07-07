import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes, scrypt as _scrypt } from 'crypto';
import { promisify } from 'util';

import { UsersService } from './users.service';

const scrypt = promisify(_scrypt);

@Injectable()
export class AuthService {
  constructor(private userServcie: UsersService) {}

  async signup(email: string, password: string) {
    // see if email is in use
    console.log('signup email:', email);
    const emails = await this.userServcie.find(email);
    if (emails.length > 0) {
      throw new BadRequestException('email in use');
    }
    // hash the users password
    //1) generate a salt
    const salt = randomBytes(8).toString('hex');
    //2) hash the salt and the password together
    const hash = (await scrypt(password, salt, 32)) as Buffer;

    //3)Join the hased result and the salt together
    const result = salt + '.' + hash.toString('hex');

    //create a new use and save it
    const user = await this.userServcie.createUser(email, result);
    //return the user
    return user;
  }

  async signin(email: string, password: string) {
    const [user] = await this.userServcie.find(email);
    if (!user) throw new NotFoundException('user not found');
    const [salt, storedHash] = user.password.split('.');
    const hash = (await scrypt(password, salt, 32)) as Buffer;
    if (storedHash !== hash.toString('hex'))
      throw new BadRequestException('bad password');
    return user;
  }
}
