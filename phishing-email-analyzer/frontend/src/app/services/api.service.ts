import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AnalysisResult, EmailRequest } from '../models/prediction';

@Injectable({
  providedIn: 'root',
})
export class ApiService {
  private readonly baseUrl = 'http://localhost:8000';

  constructor(private readonly http: HttpClient) {}

  analyze(request: EmailRequest): Observable<AnalysisResult> {
    return this.http.post<AnalysisResult>(`${this.baseUrl}/analyze`, request);
  }
}
