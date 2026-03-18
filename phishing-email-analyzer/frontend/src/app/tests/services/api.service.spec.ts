import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { ApiService } from '../../services/api.service';
import { AnalysisResult, EmailRequest } from '../../utils/interfaces/interfaces';

describe('ApiService', () => {
  let service: ApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ApiService, provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(ApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should create the service', () => {
    expect(service).toBeTruthy();
  });

  it('should call /analyze endpoint with request payload', () => {
    const requestBody: EmailRequest = {
      email_text: 'Test email body',
      model_name: 'gpt-4.1',
      sender: 'attacker@example.com',
      title: 'Suspicious Email',
    };

    const mockResponse: AnalysisResult = {
      model: 'gpt-4.1',
      prediction: 'phishing',
      reason: 'Suspicious links and urgency',
      timestamp: '2026-03-03T10:00:00Z',
      sender: 'attacker@example.com',
      title: 'Suspicious Email',
      response_time_ms: 890,
    };

    let result: AnalysisResult | undefined;
    service.analyze(requestBody).subscribe((response) => {
      result = response;
    });

    const req = httpMock.expectOne('http://localhost:8000/analyze');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(requestBody);

    req.flush(mockResponse);
    expect(result).toEqual(mockResponse);
  });
});
