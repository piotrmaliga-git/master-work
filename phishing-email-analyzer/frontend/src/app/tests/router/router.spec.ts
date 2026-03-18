import { routes } from '../../routes/app.routes';
import { HomePageComponent } from '../../pages/home/home.component';
import { NotFoundPageComponent } from '../../pages/not-found/not-found.component';

describe('App Router', () => {
  it('should create routes configuration', () => {
    expect(routes).toBeTruthy();
    expect(Array.isArray(routes)).toBe(true);
  });

  it('should define root route with lazy loaded HomePageComponent', async () => {
    const rootRoute = routes.find((route) => route.path === '');

    expect(rootRoute).toBeTruthy();
    expect(rootRoute?.loadComponent).toBeDefined();

    const loadedComponent = await rootRoute!.loadComponent!();
    expect(loadedComponent).toBe(HomePageComponent);
  });

  it('should define wildcard route with lazy loaded NotFoundPageComponent', async () => {
    const wildcardRoute = routes.find((route) => route.path === '**');

    expect(wildcardRoute).toBeTruthy();
    expect(wildcardRoute?.loadComponent).toBeDefined();

    const loadedComponent = await wildcardRoute!.loadComponent!();
    expect(loadedComponent).toBe(NotFoundPageComponent);
  });
});
