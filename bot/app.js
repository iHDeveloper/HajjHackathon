// This loads the environment variables from the .env file
require('dotenv-extended').load();

var builder = require('botbuilder');
var restify = require('restify');

// Setup Restify Server
var server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3978, function() {
    console.log('%s listening to %s', server.name, server.url);
});

// Create chat bot and listen to messages
var connector = new builder.ChatConnector({
    appId: process.env.MICROSOFT_APP_ID === undefined ? "ff01d4d5-8526-4fdc-95f8-d0dec0578d0e" : process.env.MICROSOFT_APP_ID,
    appPassword: process.env.MICROSOFT_APP_PASSWORD === undefined ? "ftdMUC643%)jruoAJTL61]!" : process.env.MICROSOFT_APP_PASSWORD
});
server.post('/api/messages', connector.listen());

var DialogLabels = {
    Supermarket: 'وقت النزوح إلى عرفة',
    Food: 'هل مسموح خروج الحجاج الان',
    Support: 'اقرب مستشفى إلى الحملة'
};

// Bot Storage: Here we register the state storage for your bot. 
// Default store: volatile in-memory store - Only for prototyping!
// We provide adapters for Azure Table, CosmosDb, SQL Azure, or you can implement your own!
// For samples and documentation, see: https://github.com/Microsoft/BotBuilder-Azure
var inMemoryStorage = new builder.MemoryBotStorage();

var bot = new builder.UniversalBot(connector, [
    function(session) {
        // prompt for search option
        session.send(`1 => ${DialogLabels.Supermarket}`);
        session.send(`2 => ${DialogLabels.Food}`);
        session.send(`3 => ${DialogLabels.Support}`);
        builder.Prompts.number(session, 'اختر رقم الخدمة');
        // builder.Prompts.choice(
        //     session,
        //     'List:- ', [DialogLabels.Supermarket, DialogLabels.Food, DialogLabels.Support], {
        //         maxRetries: 3,
        //         retryPrompt: 'اجابة غير صحيحة'
        //     });
    },
    function(session, result) {
        if (!result.response) {
            // exhausted attemps and no selection, start over
            session.send('محاولات كثير حاول مرة اخرى!');
            return session.endDialog();
        }

        // on error, start over
        session.on('error', function(err) {
            session.endDialog();
        });

        // continue on proper dialog
        var selection = result.response;
        switch (selection) {
            case 1:
                return session.beginDialog('supermarket');
            case 2:
                return session.beginDialog('food');
            case 3:
                return session.beginDialog('support');
        }
    }
]).set('storage', inMemoryStorage); // Register in memory storage

// log any bot errors into the console
bot.on('error', function(e) {
    console.log('لقد حدث خطا!', e);
});