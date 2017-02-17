const request = require('request');
const osc = require('osc');
const cheerio = require('cheerio');
const ms = require('ms');
const winston = require('winston');
const log = new (winston.Logger);
log.add(winston.transports.Console, {
    prettyPrint: true,
    colorize: true,
    timestamp: true
});

const udpPort = new osc.UDPPort({
    localAddress: '0.0.0.0',
    localPort: 27015,
    remoteAddress: '127.0.0.1',
    remotePort: 27016
});
udpPort.open();
function fetchAndSend () {
    request('http://news.agrofy.com.ar/especiales/soja15-16/precios-soja', function (err, response, body) {
        if (!err) {
            $ = cheerio.load(body);
            const prices = $('.price').map(function (i, elem) {
                return $(this).html().replace('.', '').match(/[0-9]+,[0-9]+/)[0].replace(',', '.');
            }).get().map(Number.parseFloat);

            const oscOutput = [{
                address: '/cbot',
                args: prices[0]
            }, {
                address: '/matba',
                args: prices[1]
            }, {
                address: '/rosario',
                args: prices[2]
            }];
            const missingPrice = prices.findIndex(p => !p);
            if (missingPrice !== -1) {
                log.error(`El precio ${missingPrice} no se pudo parsear (${prices[missingPrice]})`);
            } else {
                log.info(`Enviando ${JSON.stringify(oscOutput)}`);
                oscOutput.forEach(p => udpPort.send(p));
            }
        } else {
            log.error(err);
        }
        setTimeout(fetchAndSend, ms('2s'));
    });
}
fetchAndSend();
