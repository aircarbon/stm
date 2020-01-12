const CONST = require('../const.js');

contract("StMaster", accounts => {

    // https://iancoleman.io/bip39/#english
    it(`misc - bip39 - should be able to use a maximum entropy (24 word = 512-bit) BIP39 mnemonic (BIP44 HD)`, async () => {
        for (let i=0 ; i < 10 ; i++) {
            const x = await CONST.getAccountAndKey(i, 'trick clog bounce style early business emotion sun piece divide office fiscal attract betray virus salute cannon test blood stick nose reform turkey oval');
            console.log(`${i} addr: ${x.addr} privKey: ${x.privKey}`);
            if (i==0) {
                assert(x.privKey == '0x4e4dfa0683f3460113343f236b600ab816df8773b6749b420e3a07d0ff7aaf28')
            }
        }
    });
});