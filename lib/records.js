import { loadTable } from './tables'
import { maiusculasEMinusculas } from '../app/text'
import ids from './ids'

export const dateStringToDate = (dateString) => {
    try {
        var year = dateString.substring(0, 4);
        var month = dateString.substring(4, 6);
        var day = dateString.substring(6, 8);
        var date = new Date(year, month - 1, day);
        const offset = date.getTimezoneOffset()
        date = new Date(date.getTime() - (offset * 60 * 1000));
        return date;
    } catch (error) {
        return null;
    }
}

const dateToDateString = (date) => {
    return date.toISOString().slice(0, 10).replace(/-/g, '');
}


export const getRecords = async(sessionId, codunidade, pMagistrados, pTiposDesignacao, pMotivosDesignacao, pCriteriosPromocao, pMotivosRemocao) => {
    const pUnidades = loadTable(sessionId, ids.METABASE_DATABASE, ids.METABASE_TABLE_UNIDADE, 18381, codunidade)
    const pDesignacoes = loadTable(sessionId, ids.METABASE_DATABASE, ids.METABASE_TABLE_DESIGNACAO, 18188, codunidade)
    const pPromocoes = loadTable(sessionId, ids.METABASE_DATABASE, ids.METABASE_TABLE_PROMOCAO, 18373, codunidade)
    const pRemocoesDe = loadTable(sessionId, ids.METABASE_DATABASE, ids.METABASE_TABLE_REMOCAO, 18121, codunidade)
    const pRemocoesPara = loadTable(sessionId, ids.METABASE_DATABASE, ids.METABASE_TABLE_REMOCAO, 18117, codunidade)

    const unidades = await pUnidades
        // console.log('unidades', unidades)
    const unidade = unidades[0]
    const title = unidade['DescricaoDesignacao']

    const designacoes = await pDesignacoes
        // console.log(designacoes[0])

    const matriculas = [...new Set(designacoes.map(d => d['Matricula']))]
        // console.log(matriculas)

    let magistrados = await pMagistrados
        // let magistrados = await Fetcher.post(`${process.ids.METABASE_API_URL}/card/${process.ids.METABASE_CARD_MAGISTRADOS}/query/json`, {}, {
        //   headers: { "X-Metabase-Session": session.id }
        // })
        // console.log(magistrados.length)
    magistrados = magistrados.filter(d => matriculas.includes(d['Matricula']))
        // console.log(magistrados.length)
        // console.log(magistrados[0])

    magistrados = magistrados.reduce((prev, cur) => ({...prev, [cur.Matricula]: cur }), {})

    let tiposDesignacao = await pTiposDesignacao
        // console.log(tiposDesignacao.length)
        // console.log(tiposDesignacao[0])
    tiposDesignacao = tiposDesignacao.reduce((prev, cur) => ({...prev, [cur.CodigoTipoDesignacao]: cur }), {})

    let motivosDesignacao = await pMotivosDesignacao
        // console.log(motivosDesignacao.length)
        // console.log(motivosDesignacao[0])
    motivosDesignacao = motivosDesignacao.reduce((prev, cur) => ({...prev, [cur.CodigoMotivoDesignacao]: cur }), {})

    const criteriosPromocao = await pCriteriosPromocao
        // console.log('criteriosPromocao', criteriosPromocao)
    const motivosRemocao = await pMotivosRemocao

    let prorem = []

    const descrFormaIngresso = (codigo) => {
        const criterioPromocao = criteriosPromocao.find(m => m.CodigoFormaIngresso === codigo)
        const descricaoFormaIngresso = criterioPromocao ? criterioPromocao.DescricaoFormaIngresso || `Código: ${codigo}` : `Código: ${codigo}`
        return descricaoFormaIngresso
    }

    const promocoes = await pPromocoes
        // console.log('promocoes', promocoes)
    promocoes.forEach(p => {
        prorem.push({
            tipo: 'Promoção',
            matricula: p.Matricula,
            inicio: p.DataInicioExercicio,
            fim: p.DataFinalExercicio,
            descricao: 'Promoção: ' + descrFormaIngresso(p.CodigoCriterioPromocao),
            obs: [p.Observacao1, p.Observacao2, p.Observacao3].join(' ').trim(),
            doc: p.NumeroAto
        })
    })

    const remocoesDe = await pRemocoesDe
    remocoesDe.forEach(p => {
        prorem.push({
            tipo: 'Remoção (De)',
            matricula: p.Matricula,
            inicio: p.DataRemocao,
            fim: p.DataFinalExercicio,
            descricao: 'Remoção (de): ' + motivosRemocao.find(m => m.CodigoMotivoRemocao === p.CodigoMotivoRemocao).DescricaoMotivoRemocao,
            obs: [p.Observacao1, p.Observacao2].join(' ').trim(),
            doc: p.DocumentoRemocao
        })
    })

    const remocoesPara = await pRemocoesPara
    remocoesPara.forEach(p => {
        prorem.push({
            tipo: 'Remoção',
            matricula: p.Matricula,
            inicio: p.DataRemocao,
            fim: p.DataFinalExercicio,
            descricao: 'Remoção: ' + motivosRemocao.find(m => m.CodigoMotivoRemocao === p.CodigoMotivoRemocao).DescricaoMotivoRemocao,
            obs: [p.Observacao1, p.Observacao2].join(' ').trim(),
            doc: p.DocumentoRemocao
        })

    })

    prorem = prorem.sort((a, b) => {
        if (a.matricula !== b.matricula) return a.matricula.localeCompare(b.matricula)
        return a.inicio.localeCompare(b.inicio)
    })

    // prorem.forEach(d => d[1] = maiusculasEMinusculas(magistrados[d[1]] ? magistrados[d[1]].NomeMagistrado : `Magistrado não localizado (${d[1]})`))

    // console.log('prorem ordenado', prorem)

    // Método que calcula YYYYMMDD -1
    const dateMinusOne = (date) => {
        const d = dateStringToDate(date);
        d.setDate(d.getDate() - 1);
        const formattedDate = dateToDateString(d);
        return formattedDate;
    }

    // Fecha datas de fim quando há informação de início de outra remoção
    prorem.forEach((d, i, a) => {
        const next = (i < a.length - 1) && (d.matricula === a[i + 1].matricula) ? a[i + 1] : undefined
        if (!d.fim && next && next.inicio) {
            d.fim = dateMinusOne(next.inicio)
            d.fimForcado = `registro sem data de fim, aplicada a data de um dia antes do início da próxima remoção (${dt.fim})`
        }
    })

    // console.log('prorem com data de fim', prorem)

    prorem = prorem.filter(p => p.tipo !== 'Remoção (De)')

    // console.log('prorem sem Remoção (De)', prorem)

    // Fill records array
    const records = []
    designacoes.forEach(p => {
        records.push({
            matricula: p.Matricula,
            // descricao: maiusculasEMinusculas(motivosDesignacao[p.CodigoMotivoDesignacao].DescricaoMotivoDesignacao),
            descricao: maiusculasEMinusculas(tiposDesignacao[p.CodigoTipoDesignacao].DescricaoTipoDesignacao),
            inicio: dateStringToDate(p['DataInicioDesignacao']),
            fim: dateStringToDate(p['DataTerminoDesignacao']),
            motivo: maiusculasEMinusculas(motivosDesignacao[p.CodigoMotivoDesignacao].DescricaoMotivoDesignacao),
            obs: [p.Observacao1, p.Observacao2, p.Observacao3, p.Observacao4].join(' ').trim(),
            doc: p.NumeroExpediente
        })
    })
    prorem.forEach(d => {
        records.push({
            matricula: d.matricula,
            descricao: maiusculasEMinusculas(d.descricao),
            inicio: dateStringToDate(d.inicio),
            fim: dateStringToDate(d.fim),
            obs: d.obs,
            doc: d.doc
        })
    })

    // Fix end date
    records.forEach(r => {
        if (r.fim && r.fim < r.inicio) {
            r.fimForcado = (r.fimForcado ? r.fimForcado + ', ' : '') + `registro com fim anterior ao início (${dateToDateString(r.fim)})`
            r.fim = undefined
        }
        if (r.fim === undefined && magistrados[r.matricula] && magistrados[r.matricula].DataAfastamento) {
            r.fimForcado = (r.fimForcado ? r.fimForcado + ', ' : '') + 'aplicada a data de afastamento'
            r.fim = dateStringToDate(magistrados[r.matricula].DataAfastamento)
        }
        if (r.fim === undefined) {
            r.fimForcado = (r.fimForcado ? r.fimForcado + ', ' : '') + 'aplicada a data de hoje'
            r.fim = new Date()
        }
    })

    // Sort by most recent end date
    records.sort((a, b) => b.fim - a.fim)
    return { records, title }
}

export const getRecordsDeMagistrado = async(sessionId, codmagistrado, pUnidades, pTiposDesignacao, pMotivosDesignacao, pCriteriosPromocao, pMotivosRemocao) => {
    const pMagistrado = loadTable(sessionId, ids.METABASE_DATABASE, ids.METABASE_TABLE_MAGISTRADO, 18051, codmagistrado)
    const pDesignacoes = loadTable(sessionId, ids.METABASE_DATABASE, ids.METABASE_TABLE_DESIGNACAO, 18193, codmagistrado)
    const pPromocoes = loadTable(sessionId, ids.METABASE_DATABASE, ids.METABASE_TABLE_PROMOCAO, 18374, codmagistrado)
    const pRemocoes = loadTable(sessionId, ids.METABASE_DATABASE, ids.METABASE_TABLE_REMOCAO, 18127, codmagistrado)

    // console.log('unidades', unidades)
    // const unidade = unidades[0]

    const designacoes = await pDesignacoes
        // console.log(designacoes[0])

    // const matriculas = [...new Set(designacoes.map(d => d['Matricula']))]
    //     // console.log(matriculas)

    let unidades = await pUnidades
        // let magistrados = await Fetcher.post(`${process.ids.METABASE_API_URL}/card/${process.ids.METABASE_CARD_MAGISTRADOS}/query/json`, {}, {
        //   headers: { "X-Metabase-Session": session.id }
        // })
        // console.log(magistrados.length)
        // unidades = unidades.filter(d => matriculas.includes(d['Matricula']))
        // console.log(magistrados.length)
        // console.log(magistrados[0])

    unidades = unidades.reduce((prev, cur) => ({...prev, [cur.CodigoDesignacao]: cur }), {})

    let tiposDesignacao = await pTiposDesignacao
        // console.log(tiposDesignacao.length)
        // console.log(tiposDesignacao[0])
    tiposDesignacao = tiposDesignacao.reduce((prev, cur) => ({...prev, [cur.CodigoTipoDesignacao]: cur }), {})

    let motivosDesignacao = await pMotivosDesignacao
        // console.log(motivosDesignacao.length)
        // console.log(motivosDesignacao[0])
    motivosDesignacao = motivosDesignacao.reduce((prev, cur) => ({...prev, [cur.CodigoMotivoDesignacao]: cur }), {})

    const criteriosPromocao = await pCriteriosPromocao
        // console.log('criteriosPromocao', criteriosPromocao)
    const motivosRemocao = await pMotivosRemocao

    let prorem = []

    const promocoes = await pPromocoes
        // console.log('promocoes', promocoes)
    promocoes.forEach(p => {
        prorem.push({
            tipo: 'Promoção',
            matricula: p.Matricula,
            codunidade: p.CodigoJurisdicao,
            inicio: p.DataInicioExercicio,
            fim: p.DataFinalExercicio,
            descricao: 'Promoção: ' + descrFormaIngresso(p.CodigoCriterioPromocao),
            obs: [p.Observacao1, p.Observacao2, p.Observacao3].join(' ').trim(),
            doc: p.NumeroAto
        })
    })

    const remocoes = await pRemocoes
    remocoes.forEach(p => {
        prorem.push({
            tipo: 'Remoção',
            matricula: p.Matricula,
            codunidade: p.CodigoUnidadeDestino,
            inicio: p.DataRemocao,
            fim: p.DataFinalExercicio,
            descricao: 'Remoção: ' + motivosRemocao.find(m => m.CodigoMotivoRemocao === p.CodigoMotivoRemocao).DescricaoMotivoRemocao,
            obs: [p.Observacao1, p.Observacao2].join(' ').trim(),
            doc: p.DocumentoRemocao
        })
    })

    prorem = prorem.sort((a, b) => {
        if (a.matricula !== b.matricula) return a.matricula.localeCompare(b.matricula)
        return a.inicio.localeCompare(b.inicio)
    })

    // prorem.forEach(d => d[1] = maiusculasEMinusculas(magistrados[d[1]] ? magistrados[d[1]].NomeMagistrado : `Magistrado não localizado (${d[1]})`))

    // console.log('prorem ordenado', prorem)

    // Método que calcula YYYYMMDD -1
    const dateMinusOne = (date) => {
        const d = dateStringToDate(date);
        d.setDate(d.getDate() - 1);
        const formattedDate = dateToDateString(d);
        return formattedDate;
    }

    // Fecha datas de fim quando há informação de início de outra remoção
    prorem.forEach((d, i, a) => {
        const next = (i < a.length - 1) && (d.matricula === a[i + 1].matricula) ? a[i + 1] : undefined
        if (!d.fim && next && next.inicio) {
            d.fim = dateMinusOne(next.inicio)
            d.fimForcado = `registro sem data de fim, aplicada a data de um dia antes do início da próxima remoção (${dt.fim})`
        }
    })


    // Fill records array
    const records = []
    designacoes.forEach(p => {
        records.push({
            matricula: p.Matricula,
            codunidade: p.CodigoDesignacao,
            // descricao: maiusculasEMinusculas(motivosDesignacao[p.CodigoMotivoDesignacao].DescricaoMotivoDesignacao),
            descricao: maiusculasEMinusculas(tiposDesignacao[p.CodigoTipoDesignacao].DescricaoTipoDesignacao),
            inicio: dateStringToDate(p['DataInicioDesignacao']),
            fim: dateStringToDate(p['DataTerminoDesignacao']),
            motivo: maiusculasEMinusculas(motivosDesignacao[p.CodigoMotivoDesignacao].DescricaoMotivoDesignacao),
            obs: [p.Observacao1, p.Observacao2, p.Observacao3, p.Observacao4].join(' ').trim(),
            doc: p.NumeroExpediente
        })
    })
    prorem.forEach(d => {
        records.push({
            matricula: d.matricula,
            codunidade: d.codunidade,
            descricao: maiusculasEMinusculas(d.descricao),
            inicio: dateStringToDate(d.inicio),
            fim: dateStringToDate(d.fim),
            obs: d.obs,
            doc: d.doc
        })
    })

    const magistrado = (await pMagistrado)[0]

    // Fix end date
    records.forEach(r => {
        if (r.fim && r.fim < r.inicio) {
            r.fimForcado = (r.fimForcado ? r.fimForcado + ', ' : '') + `registro com fim anterior ao início (${dateToDateString(r.fim)})`
            r.fim = undefined
        }
        if (r.fim === undefined && magistrado.DataAfastamento) {
            r.fimForcado = (r.fimForcado ? r.fimForcado + ', ' : '') + 'aplicada a data de afastamento'
            r.fim = dateStringToDate(magistrado.DataAfastamento)
            if (r.fim < r.inicio) {
                r.fimForcado = (r.fimForcado ? r.fimForcado + ', ' : '') + 'ajustada data de início posterior ao afastamento'
                r.inicio = r.fim
            }

        }
        if (r.fim === undefined) {
            r.fimForcado = (r.fimForcado ? r.fimForcado + ', ' : '') + 'aplicada a data de hoje'
            r.fim = new Date()
        }
    })

    // Sort by most recent end date
    records.sort((a, b) => b.fim - a.fim)

    const title = magistrado['NomeMagistrado']
    return { records, title }
}