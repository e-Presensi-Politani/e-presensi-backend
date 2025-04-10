import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);
  const port = configService.get<number>('APP_PORT');
  if (!port) {
    throw new Error('APP_PORT is not defined in the environment variables');
  }
  await app.listen(port);
}

bootstrap();
