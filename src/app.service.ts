import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
    return 'e-Presensi Politani API is running ✅';
  }
}
