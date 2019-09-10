const Telegraf = require('telegraf'),
      Extra = require('telegraf/extra'),
      Markup = require('telegraf/markup'),
      Router = require('telegraf/router'),
      session = require('telegraf/session'),
      fs = require('fs'),
      nconf = require('nconf')

nconf.file({file: 'db.json'})

const bot = new Telegraf(nconf.get('bot_token'))

bot.use(session({ ttl: 30 }))

bot.start((ctx) => ctx.reply('Oispa tilastoja!'))

bot.command('kahvihetki', (ctx) => {
    ctx.session = {}
    return ctx.reply('Juotko kahvia?', Extra.HTML().markup((m) =>
        m.inlineKeyboard([
            m.callbackButton('Juon kahvia', 'kahvi'),
            m.callbackButton('Teetä minulle', 'tee'),
            m.callbackButton('Kaljaaaaa', 'kalja')
        ])
    ))
})

const stats = new Router(({ callbackQuery }) => {
    if (!callbackQuery.data) {
        return
    }
    return {
        route: 'drink',
        state: {
            drink: callbackQuery.data
        }
    }
})

stats.on('drink', (ctx) => {
    let chat = ctx.update.callback_query.message.chat.id
    let msg = ctx.update.callback_query.message.message_id
    let from = ctx.from.id
    let drink = ctx.state.drink
    nconf.set('stats:'+chat+':'+msg+':'+from, drink)
    nconf.save()
    return editText(ctx, chat, msg, from, drink)
})

const editText = (ctx, chat, msg, from, drink) => {
    let drinks = nconf.get('stats:'+chat+':'+msg)
    let amount = { tee: 0, kahvi: 0, kalja: 0 }
    let all = 0
    for(let key in drinks) {
        if (drinks.hasOwnProperty(key)) {
            amount[drinks[key]]++
            all++
        }
    }
    ctx.editMessageText(`Juotko kahvia? (${all})`, Extra.HTML().markup((m) =>
        m.inlineKeyboard([
            m.callbackButton(`Jep! (${amount['kahvi']})`, 'kahvi'),
            m.callbackButton(`Teetä! (${amount['tee']})`, 'tee'),
            m.callbackButton(`Kaljaa! (${amount['kalja']})`, 'kalja')
        ])
    ))
    return
}

bot.on('callback_query', stats)

bot.launch()
