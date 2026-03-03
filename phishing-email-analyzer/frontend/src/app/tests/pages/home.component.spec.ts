import { of, throwError } from 'rxjs';
import { HomePageComponent } from '../../pages/home/home.component';

describe('HomePageComponent', () => {
  let component: HomePageComponent;
  let apiServiceMock: { analyze: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    apiServiceMock = {
      analyze: vi.fn(),
    };

    component = new HomePageComponent(apiServiceMock as any);
  });

  it('should map payload and set result on successful analyze request', async () => {
    const response = {
      model: 'gpt-4.1',
      prediction: 'phishing' as const,
      reason: 'Suspicious content',
      timestamp: '2026-03-03T12:00:00Z',
      sender: 'attacker@example.com',
    };
    apiServiceMock.analyze.mockReturnValue(of(response));

    await component.onAnalyzeRequest({
      emailText: 'Mail body',
      selectedModel: 'gpt-4.1',
      sender: 'sender@example.com',
    });

    expect(apiServiceMock.analyze).toHaveBeenCalledWith({
      email_text: 'Mail body',
      model_name: 'gpt-4.1',
      sender: 'sender@example.com',
    });
    expect(component.result()).toEqual(response);
    expect(component.error()).toBe('');
    expect(component.loading()).toBe(false);
  });

  it('should set backend detail error when analyze request fails', async () => {
    apiServiceMock.analyze.mockReturnValue(
      throwError(() => ({ error: { detail: 'Backend timeout' } }))
    );

    await component.onAnalyzeRequest({
      emailText: 'Mail body',
      selectedModel: 'gpt-4.1',
    });

    expect(component.result()).toBeNull();
    expect(component.error()).toBe('Backend timeout');
    expect(component.loading()).toBe(false);
  });
});
