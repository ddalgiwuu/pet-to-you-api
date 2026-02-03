import { Controller, Get } from '@nestjs/common';

@Controller('test')
export class TestController {
  @Get()
  ping() {
    return { message: 'Hospital module is working!' };
  }

  @Get('hospitals-test')
  hospitalsTest() {
    return { message: 'Hospitals test endpoint working!' };
  }
}
