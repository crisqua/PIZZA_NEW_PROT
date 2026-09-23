import { businessDayKeySaoPaulo, businessDayRangeSaoPaulo } from './sao-paulo-date.util';

describe('sao-paulo-date.util', () => {
  describe('businessDayKeySaoPaulo', () => {
    it('pedido as 00h20 (Sao Paulo) conta pro dia anterior (antes do corte das 5h)', () => {
      const at0020 = new Date('2026-09-23T00:20:00.000-03:00');
      expect(businessDayKeySaoPaulo(at0020)).toBe('20260922');
    });

    it('pedido as 04h59 (Sao Paulo) ainda conta pro dia anterior', () => {
      const at0459 = new Date('2026-09-23T04:59:00.000-03:00');
      expect(businessDayKeySaoPaulo(at0459)).toBe('20260922');
    });

    it('pedido as 05h00 (Sao Paulo) exatamente ja conta pro novo dia', () => {
      const at0500 = new Date('2026-09-23T05:00:00.000-03:00');
      expect(businessDayKeySaoPaulo(at0500)).toBe('20260923');
    });

    it('pedido as 18h (horario normal de abertura) conta pro dia corrente, sem surpresa', () => {
      const at18h = new Date('2026-09-22T18:00:00.000-03:00');
      expect(businessDayKeySaoPaulo(at18h)).toBe('20260922');
    });
  });

  describe('businessDayRangeSaoPaulo', () => {
    it('o range de um dia comeca as 5h e termina as 5h do dia seguinte', () => {
      const { start, end } = businessDayRangeSaoPaulo('2026-09-22');
      expect(start.toISOString()).toBe('2026-09-22T08:00:00.000Z'); // 05h Sao Paulo = 08h UTC
      expect(end.toISOString()).toBe('2026-09-23T08:00:00.000Z');
    });

    it('um pedido as 00h20 do dia seguinte cai DENTRO do range do dia anterior', () => {
      const { start, end } = businessDayRangeSaoPaulo('2026-09-22');
      const at0020 = new Date('2026-09-23T00:20:00.000-03:00');
      expect(at0020 >= start && at0020 < end).toBe(true);
    });

    it('um pedido as 05h00 do dia seguinte cai FORA do range do dia anterior', () => {
      const { start, end } = businessDayRangeSaoPaulo('2026-09-22');
      const at0500 = new Date('2026-09-23T05:00:00.000-03:00');
      expect(at0500 >= start && at0500 < end).toBe(false);
    });
  });
});
