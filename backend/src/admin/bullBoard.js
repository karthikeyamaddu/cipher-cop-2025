import { createBullBoard } from '@bull-board/api';
import { BullAdapter } from '@bull-board/api/bullAdapter';
import { ExpressAdapter } from '@bull-board/express';
import { phishingQueue, cloneQueue, malwareQueue, scamQueue } from '../queues/index.js';

// Create Express adapter for Bull Board
const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath('/admin/queues');

// Create Bull Board with all queues
createBullBoard({
  queues: [
    new BullAdapter(phishingQueue),
    new BullAdapter(cloneQueue),
    new BullAdapter(malwareQueue),
    new BullAdapter(scamQueue)
  ],
  serverAdapter
});

export { serverAdapter };
