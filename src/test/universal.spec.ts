import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from '../app.controller';
import { AppService } from '../app.service';

describe('Universal App Test', () => {
  let appController: AppController;

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    appController = moduleRef.get<AppController>(AppController);
  });

  it('should return API running message', () => {
    const message = appController.getHello();
    expect(message).toMatch(/e-?Presensi Politani API is running/i);
  });
});
