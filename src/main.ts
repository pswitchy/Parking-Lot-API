import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { Logger } from '@nestjs/common';


async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger('Bootstrap');

  // Enable CORS if needed (useful for frontend testing)
  app.enableCors();

  // Use global validation pipe
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true, // Strip properties not defined in DTO
    forbidNonWhitelisted: true, // Throw error if extra properties are sent
    transform: true, // Automatically transform payloads to DTO instances
    transformOptions: {
        enableImplicitConversion: true, // Allows automatic conversion (e.g., string query param to number if expected)
    },
  }));

  const port = process.env.PORT || 3000;
  await app.listen(port);
  logger.log(`Application listening on port ${port}`);

}
bootstrap();