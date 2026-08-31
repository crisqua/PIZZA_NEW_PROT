import { MemoryCacheService } from './memory-cache.service';

describe('MemoryCacheService', () => {
  let cache: MemoryCacheService;

  beforeEach(() => {
    cache = new MemoryCacheService();
  });

  it('retorna null pra chave nunca setada', async () => {
    expect(await cache.get('missing')).toBeNull();
  });

  it('guarda e devolve um valor dentro do TTL', async () => {
    await cache.set('k', { a: 1 }, 60);
    expect(await cache.get('k')).toEqual({ a: 1 });
  });

  it('expira apos o TTL (checado sob demanda na leitura)', async () => {
    const nowSpy = jest.spyOn(Date, 'now');
    nowSpy.mockReturnValue(1000);
    await cache.set('k', 'v', 1);
    nowSpy.mockReturnValue(1000 + 1001);
    expect(await cache.get('k')).toBeNull();
    nowSpy.mockRestore();
  });

  it('del remove a chave imediatamente', async () => {
    await cache.set('k', 'v', 60);
    await cache.del('k');
    expect(await cache.get('k')).toBeNull();
  });
});
