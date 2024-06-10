import { dateDiff } from '../../../date'
import Timeline from '../../../timeline'
import { renderToStringServer, maiusculasEMinusculas } from '../../../text'
// import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
// import { faCheckToSlot } from '@fortawesome/free-solid-svg-icons'
import Fetcher from '../../../fetcher'
import { getRecords } from './records'
import { loadTable } from './tables'
import ids from './ids'
import { obterAfastamentos } from './afastamentos'

export default async function PageContent({ params }) {
  let title = ''
  let data = []
  try {
    const session = await Fetcher.post(`${process.env.METABASE_API_URL}/session`, {
      "username": process.env.METABASE_USERNAME,
      "password": process.env.METABASE_PASSWORD
    })

    // console.log('session', session)

    const sessionId = session.id

    const pMagistrados = loadTable(sessionId, ids.METABASE_DATABASE, ids.METABASE_TABLE_MAGISTRADO)
    const pTiposDesignacao = loadTable(sessionId, ids.METABASE_DATABASE, ids.METABASE_TABLE_TIPO_DESIGNACAO)
    const pMotivosDesignacao = loadTable(sessionId, ids.METABASE_DATABASE, ids.METABASE_TABLE_MOTIVO_DESIGNACAO)
    const pCriteriosPromocao = loadTable(sessionId, ids.METABASE_DATABASE, ids.METABASE_TABLE_CRITERIO_PROMOCAO)
    const pMotivosRemocao = loadTable(sessionId, ids.METABASE_DATABASE, ids.METABASE_TABLE_MOTIVO_REMOCAO)

    let unidades = params.unidades
    // console.log('unidades', unidades)
    unidades = unidades.map((u) => {
      return {
        sigla: u,
        pRecords: getRecords(sessionId, u, pMagistrados, pTiposDesignacao, pMotivosDesignacao, pCriteriosPromocao, pMotivosRemocao)
      }
    })

    for (let i = 0; i < unidades.length; i++) {
      const unidade = unidades[i]
      const { records, title } = await unidade.pRecords
      unidade.records = records
      unidade.title = title
    }

    // console.log('unidades', unidades)

    title = unidades[0].title
    let records = []
    unidades.forEach(u => { records = [...records, ...u.records] })
    // Sort by most recent end date
    records.sort((a, b) => b.fim - a.fim)

    const afastamentos = await obterAfastamentos(sessionId, records)

    // console.log('afastamentos', afastamentos)

    records = [...records, ...afastamentos]

    const tooltip = (position, name, start, end, tooltips) => {
      const omitirDataDeFim = tooltips.find(t => t.label === 'Data de fim forçada' && t.value.includes('aplicada a data de hoje'))

      return renderToStringServer(
        <div style={{ minWidth: '15em', maxWidth: '20em', backgroundColor: 'white', border: '1px solid black', fontFamily: 'sans-serif' }}>
          <div style={{ padding: '.5em .5em .5em .5em', fontWeight: 'bold', textAlign: 'left', backgroundColor: 'lightgray' }}>
            {position}
          </div>
          <hr c style={{ margin: '0' }} />
          <div style={{ padding: '.5em .5em .5em .5em', fontWeight: 'bold' }}>
            {name}
          </div>
          <hr style={{ margin: '0' }} />
          <div style={{ padding: '.5em .5em .5em .5em' }}>
            <b>De:</b> {start.toLocaleDateString('en-GB')} <b>a:</b> {omitirDataDeFim ? '-' : end.toLocaleDateString('en-GB')}
            {dateDiff(start, end)
              ? <><br /><b>Duração:</b> {dateDiff(start, end)}</>
              : <></>}
          </div>
          {tooltips.filter(t => t.value).map(t =>
            <>
              <hr key={`hr-${t.label}`} style={{ margin: '0' }} />
              <div key={`div-${t.label}`} style={{ padding: '.5em .5em .5em .5em' }}><b>{t.label}:</b> {t.value}</div>
            </>
          )}
        </div>)
    }

    // Tirar isso daqui...
    let magistrados = await pMagistrados
    // magistrados = magistrados.filter(d => matriculas.includes(d['Matricula']))
    magistrados = magistrados.reduce((prev, cur) => ({ ...prev, [cur.Matricula]: cur }), {})

    // Build data array
    data = [[
      { type: "string", id: "Position" },
      { type: "string", id: "Name" },
      { type: "string", role: "tooltip" },
      { type: "date", id: "Start" },
      { type: "date", id: "End" },
      { type: "string", role: "link" },
    ], ...records.map(r => {
      const position = maiusculasEMinusculas(magistrados[r.matricula] ? magistrados[r.matricula].NomeMagistrado : `Magistrado não localizado (${r.matricula})`)
      const tooltips = []
      if (r.fimForcado) tooltips.push({ label: 'Data de fim forçada', value: r.fimForcado })
      if (r.motivo) tooltips.push({ label: 'Motivo', value: r.motivo })
      if (r.obs) tooltips.push({ label: 'Observações', value: r.obs })
      if (r.doc) tooltips.push({ label: 'Documento', value: r.doc })
      return [position, r.descricao, tooltip(position, r.descricao, r.inicio, r.fim, tooltips), r.inicio, r.fim, '']
    })]
  } catch (error) {
    console.error(error)
    return <div className="alert alert-danger" role="alert">Erro ao carregar dados: {error}</div>
  }

  return (
    <>
      <h2 className='mt-3 mb-3' style={{ textAlign: 'center' }}>{title}</h2>
      <div className="container-fluid content h-100">
        <Timeline data={data} />
      </div>
    </>
  )
}
