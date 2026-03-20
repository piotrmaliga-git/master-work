import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { LocaleService } from '../../services/locale.service';

describe('LocaleService', () => {
  let service: LocaleService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [LocaleService, provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(LocaleService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should create the service', () => {
    expect(service).toBeTruthy();
  });

  it('should POST preferred locale to /api/locale', async () => {
    const promise = service.setPreferredLocale('pl');

    const req = httpMock.expectOne('/api/locale');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ locale: 'pl' });

    req.flush(null);
    await expect(promise).resolves.toBeNull();
  });
});
