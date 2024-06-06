import { dateStringToDate } from "./records"
import { loadTable } from "./tables"
import ids from "./ids"

type Registro = {
    matricula: any;
    descricao: string;
    inicio: any;
    fim: any;
    motivo: string | undefined;
    obs: string;
    doc: any | undefined;
}

export const obterAfastamentos = async (sessionId, records: Registro[]) => {
    // @ts-ignore
    const matriculas = [...new Set(records.map(d => d.matricula))]

    console.log('matriculas', matriculas)

    // const pFerias = loadTable(sessionId, ids.METABASE_DATABASE, ids.METABASE_TABLE_FERIAS, 18235, matriculas)
    const pAusencias = loadTable(sessionId, ids.METABASE_DATABASE, ids.METABASE_TABLE_AUSENCIAS, 22375, matriculas)

    let afastamentos: Registro[] = []

    // const ferias = await pFerias
    // ferias.forEach(p => {
    //     afastamentos.push({
    //         matricula: p.Matricula,
    //         descricao: 'Férias',
    //         inicio: dateStringToDate(p['DataInicioFruicao']),
    //         fim: dateStringToDate(p['DataTerminoFruicao']),
    //         motivo: `${p['PeriodoAquisitivo']}-${p['SequencialExercicio']}`,
    //         obs: [p.Observacao1, p.Observacao2, p.Observacao3, p.Observacao4].join(' ').trim(),
    //         doc: p.NumeroExpediente
    //     })
    // })

    const ausencias = await pAusencias
    // console.log('ausencias', ausencias)
    ausencias.forEach(p => {
        afastamentos.push({
            matricula: p.Matricula,
            // descricao: maiusculasEMinusculas(tiposDesignacao[p.CodigoAusencia].DescricaoTipoDesignacao),
            descricao: 'Ausência',
            inicio: dateStringToDate(p['DataInicioAusencia']),
            fim: dateStringToDate(p['DataTerminoAusencia']),
            motivo: undefined,
            // motivo: maiusculasEMinusculas(motivosDesignacao[p.CodigoMotivoDesignacao].DescricaoMotivoDesignacao),
            obs: [p.Observacao1, p.Observacao2, p.Observacao3, p.Observacao4].join(' ').trim(),
            doc: undefined
        })
    })

    // Filtrar registros muito antigos
    const dtVeryOld = new Date(1900, 0, 1)
    afastamentos = afastamentos.filter(a =>a.inicio && a.fim && (a.inicio > dtVeryOld))

    const recordsPorMagistrado = records.reduce((acc, r) => {
        if (!acc[r.matricula]) acc[r.matricula] = []
        acc[r.matricula].push(r)
        return acc
    }, {})

    const afastamentosPorMagistrado = afastamentos.reduce((acc, r) => {
        if (!acc[r.matricula]) acc[r.matricula] = []
        acc[r.matricula].push(r)
        return acc
    }, {})

    console.log('afastamentosPorMagistrado', afastamentosPorMagistrado)

    matriculas.forEach(m => {
        const afs = afastamentosPorMagistrado[m]
        const recs = recordsPorMagistrado[m]
        if (!afs || !recs) return
        afastamentosPorMagistrado[m] = afs.filter(a => recs.some(r => (a.inicio >= r.inicio && a.inicio <= r.fim) || (a.fim >= r.inicio && a.fim <= r.fim)))
    })

    const afastamentosFiltrados: Registro[] = []
    matriculas.forEach(m => { if (afastamentosPorMagistrado[m]) afastamentosFiltrados.push(...afastamentosPorMagistrado[m]) })

    // console.log('afastamentos', afastamentos)

    return afastamentosFiltrados
}