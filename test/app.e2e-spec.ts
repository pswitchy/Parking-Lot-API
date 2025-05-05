import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest'; 
import { AppModule } from './../src/app.module';

describe('ParkingController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => { // Use beforeAll or beforeEach as needed
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
    }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('/parking-lots (POST) - should initialize the parking lot', () => {
    return request(app.getHttpServer())
      .post('/parking-lots')
      .send({ capacity: 10 })
      .expect(201)
      .expect((res) => {
        expect(res.body).toHaveProperty('message', 'Parking lot created successfully.');
        expect(res.body).toHaveProperty('capacity', 10);
      });
  });

  it('/parking-lots/parkings (POST) - should park a car after initialization', async () => {
    // First initialize
    await request(app.getHttpServer())
      .post('/parking-lots')
      .send({ capacity: 1 });

    // Then park
    return request(app.getHttpServer())
      .post('/parking-lots/parkings')
      .send({ registrationNumber: 'E2E-CAR-001', color: 'TestColor' })
      .expect(201)
      .expect((res) => {
        expect(res.body).toHaveProperty('slotNumber', 1);
        expect(res.body).toHaveProperty('registrationNumber', 'E2E-CAR-001');
      });
  });

  it('/parking-lots/parkings (POST) - should fail to park if lot is full', async () => {
    // Initialize with 1 slot
    await request(app.getHttpServer())
      .post('/parking-lots')
      .send({ capacity: 1 });

    // Park one car
    await request(app.getHttpServer())
      .post('/parking-lots/parkings')
      .send({ registrationNumber: 'FULL-CAR-1', color: 'FullColor' });

    // Try to park another
    return request(app.getHttpServer())
      .post('/parking-lots/parkings')
      .send({ registrationNumber: 'FULL-CAR-2', color: 'FullColor' })
      .expect(409) // Conflict
      .expect((res) => {
         expect(res.body.message).toEqual('Sorry, parking lot is full.');
      });
  });

});