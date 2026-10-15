import { prisma } from './prisma.js';

/** Release inventory reserved by orders that never started payment.
 * Pending STK transactions are NOT expired blindly: money may still be in flight.
 */
export async function releaseAbandonedUnpaidOrders(): Promise<number> {
  const cutoff = new Date(Date.now() - 30 * 60_000);
  const candidates = await prisma.order.findMany({
    where: { status: 'PENDING_PAYMENT', payment: { is: null }, createdAt: { lt: cutoff } },
    include: { items: true }, take: 100,
  });
  let released = 0;
  for (const order of candidates) {
    await prisma.$transaction(async tx => {
      const changed = await tx.order.updateMany({
        where: { id: order.id, status: 'PENDING_PAYMENT', payment: { is: null } },
        data: { status: 'CANCELLED' },
      });
      if (!changed.count) return;
      for (const item of order.items) {
        await tx.product.update({ where: { id: item.productId }, data: { stock: { increment: item.quantity } } });
      }
      released++;
    });
  }
  return released;
}
