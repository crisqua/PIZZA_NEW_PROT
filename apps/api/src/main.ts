import 'reflect-metadata';
import { createApp } from './bootstrap';

async function bootstrap() {
  const app = await createApp();
  const port = process.env.PORT ? Number(process.env.PORT) : 3000;
  await app.listen(port);
}

bootstrap();
