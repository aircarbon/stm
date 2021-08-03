module.exports = {
  async up(db, client) {
    // See https://github.com/seppevs/migrate-mongo/#creating-a-new-migration-script
    await db.collection('events').updateMany({}, { $set: { networkId: process.env.NETWORK_ID } });
    await db.collection('blocks').updateMany({}, { $set: { networkId: process.env.NETWORK_ID } });
    await db.collection('transactions').updateMany({}, { $set: { networkId: process.env.NETWORK_ID } });
    await db.collection('receipts').updateMany({}, { $set: { networkId: process.env.NETWORK_ID } });
    await db.collection('rawTransactions').updateMany({}, { $set: { networkId: process.env.NETWORK_ID } });
  },

  async down(db, client) {
    await db.collection('events').updateMany({}, { $unset: { networkId: null } });
    await db.collection('blocks').updateMany({}, { $unset: { networkId: null } });
    await db.collection('transactions').updateMany({}, { $unset: { networkId: null } });
    await db.collection('receipts').updateMany({}, { $unset: { networkId: null } });
    await db.collection('rawTransactions').updateMany({}, { $unset: { networkId: null } });
  },
};
