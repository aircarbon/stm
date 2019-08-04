const config = require('./config.js');

module.exports = {
    eeuType: Object.freeze({
        UNFCCC: 0,
        VCS: 1,
    }),

    tonCarbon: 1000, // one ton carbon in kg
    ktCarbon: 1000 * 1000, // kiloton carbon in kg
    mtCarbon: 1000 * 1000 * 1000, // megaton carbon in kg
    gtCarbon: 1000 * 1000 * 1000 * 1000, // gigaton carbon in kg
};
