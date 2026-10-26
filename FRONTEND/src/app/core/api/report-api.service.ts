import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
export interface FdSummary { productCode: string; currency: string; totalAccounts: number; totalPrincipal: number; totalInterestAccrued: number; }
export interface InterestHistory { accountNo: string; productCode: string; currency: string; principal: number; interestAmount: number; postedAt: string; status: string; }
export interface MaturitySummary { maturityDate: string; currency: string; totalAccounts: number; totalPrincipal: number; accruedInterest: number; }
export interface CustomerPortfolio { customerId: number; customerName: string; customerType: string; customerStatus: string; customerClassification: string; kycStatus: string; preferredLanguage: string; countryOfOrigin: string; totalAccounts: number; totalPrincipal: number; totalInterestGenerated: number; accounts: PortfolioAccount[]; }
export interface PortfolioAccount { accountNo: string; productCode: string; currency: string; principal: number; rate: number; interestGenerated: number; maturityDate: string; status: string; interestFrequency: string; }
export interface FdMaturityReport { reportType: string; reportGeneratedAt: string; customer: any; fdAccount: any; interestTransactions: any[]; transactions: any[]; maturity: any; notifications: any[]; }
@Injectable({ providedIn: 'root' })
export class ReportApiService {
  private readonly baseUrl = '/api/report';
  constructor(private readonly http: HttpClient) {}
  fdSummary(): Observable<FdSummary[]> { return this.http.get<FdSummary[]>(`${this.baseUrl}/fd-summary`); }
  interestHistory(): Observable<InterestHistory[]> { return this.http.get<InterestHistory[]>(`${this.baseUrl}/interest-transactions`); }
  maturitySummary(): Observable<MaturitySummary[]> { return this.http.get<MaturitySummary[]>(`${this.baseUrl}/maturity-summary`); }
  portfolio(): Observable<CustomerPortfolio> { return this.http.get<CustomerPortfolio>(`${this.baseUrl}/customer-portfolio`); }
  portfolioDownload(format: 'csv' | 'pdf'): Observable<Blob> { return this.http.get(`${this.baseUrl}/customer-portfolio?format=${format}`, { responseType: 'blob' }); }
  maturityReport(accountNo: string): Observable<FdMaturityReport> { return this.http.get<FdMaturityReport>(`/api/fd/reports/maturity/${encodeURIComponent(accountNo)}`); }
  maturityReportDownload(accountNo: string, format: 'pdf' | 'xlsx'): Observable<Blob> { return this.http.get(`/api/fd/reports/maturity/${encodeURIComponent(accountNo)}?format=${format}`, { responseType: 'blob' }); }
  download(path: string, format: 'csv' | 'pdf' = 'csv'): Observable<Blob> { return this.http.get(`${this.baseUrl}/${path}?format=${format}`, { responseType: 'blob' }); }
}
