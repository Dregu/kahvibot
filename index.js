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
    return ctx.reply('Aina on hyvä hetki juoda kahvia! Satutko juomaan juuri nyt kahvia tai kenties teetä? Oispa tilastoja.', Extra.HTML().markup((m) =>
        m.inlineKeyboard([
            m.callbackButton('Kahvi', 'kahvi'),
            m.callbackButton('Tee', 'tee')
        ])
    ))
})

bot.command('kaljahetki', (ctx) => {
    ctx.session = {}
    return ctx.reply('Kalja auki saatana!', Extra.HTML().markup((m) =>
        m.inlineKeyboard([
            m.callbackButton('Kippis!', 'kalja')
        ])
    ))
})

bot.command('stats', async (ctx) => {
    let chat = ctx.chat.id
    let user_id = ctx.from.id
    console.log(chat, user_id)
    let stats = nconf.get('stats:'+chat)
    console.log(stats)
    let me = { kahvi: 0, tee: 0, kalja: 0 }
    for(let key in stats) {
        if(stats.hasOwnProperty(key)) {
            for(let i in stats[key]) {
                let drink = stats[key][i]
                me[drink]++
            }
        }
    }
    let user = await ctx.getChatMember(chat, user_id)
    let name = user.user.first_name + ' ' + user.user.last_name
    let list = [
        (me.kahvi > 0?`${me.kahvi} kahvia`:''),
        (me.tee > 0?`${me.tee} teetä`:''),
        (me.kalja > 0?`${me.kalja} kaljaa`:'')
    ].filter(i => i.length > 0).join(', ').split('').reverse().join('').replace(/ ,/, ' aj ').split('').reverse().join('')
    ctx.reply(`${name} ${list.length > 0?`on juonut ${list}.`:'ei ole koskaan juonut yhtään mitään!'}`)
})

bot.command('top', (ctx) => {
    ctx.reply('Soon.')
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
    if(drink == 'kalja') {
        ctx.editMessageText(`Kalja auki saatana! (<b>${all}</b>)`, Extra.HTML().markup((m) =>
            m.inlineKeyboard([
                m.callbackButton(`Kippis! (${amount['kalja']})`, 'kalja')
            ])
        ))
    } else {
        ctx.editMessageText(`Aina on hyvä hetki juoda kahvia! Satutko juomaan juuri nyt kahvia tai kenties teetä? Oispa tilastoja. (<b>${all}</b>)`, Extra.HTML().markup((m) =>
            m.inlineKeyboard([
                m.callbackButton(`Kahvi (${amount['kahvi']})`, 'kahvi'),
                m.callbackButton(`Tee (${amount['tee']})`, 'tee')
            ])
        ))
    }
}

bot.on('callback_query', stats)

bot.launch()
