import {
  HttpInterceptorFn,
  HttpRequest,
  HttpHandlerFn,
  HttpResponse,
  HttpEvent,
} from '@angular/common/http';
import { Observable, of, tap } from 'rxjs';

interface CacheEntry {
  response: HttpResponse<unknown>;
  timestamp: number;
}

export interface CacheOptions {
  ttl?: number;
  methods?: string[];
}

const cache = new Map<string, CacheEntry>();
const DEFAULT_TTL = 5 * 60 * 1000;

export const cacheInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn
): Observable<HttpEvent<unknown>> => {
  if (req.method !== 'GET') {
    return next(req);
  }

  if (req.headers.has('X-No-Cache')) {
    const cleanReq = req.clone({ headers: req.headers.delete('X-No-Cache') });
    return next(cleanReq);
  }

  const ttl = req.headers.has('X-Cache-TTL')
    ? Number.parseInt(req.headers.get('X-Cache-TTL') ?? '', 10)
    : DEFAULT_TTL;

  const cacheKey = req.urlWithParams;
  const cached = cache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < ttl) {
    return of(cached.response.clone());
  }

  return next(req).pipe(
    tap(event => {
      if (event instanceof HttpResponse && event.status === 200) {
        cache.set(cacheKey, { response: event.clone(), timestamp: Date.now() });
        cleanExpiredCache(ttl);
      }
    })
  );
};

export function invalidateCache(urlPattern: string): void {
  for (const key of cache.keys()) {
    if (key.includes(urlPattern)) {
      cache.delete(key);
    }
  }
}

function cleanExpiredCache(ttl: number): void {
  const now = Date.now();
  for (const [key, entry] of cache.entries()) {
    if (now - entry.timestamp > ttl) {
      cache.delete(key);
    }
  }
}
