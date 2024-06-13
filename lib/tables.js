import Fetcher from '../app/fetcher'

export const assertSession = async() => {
    return await Fetcher.post(`${process.env.METABASE_API_URL}/session`, {
        "username": process.env.METABASE_USERNAME,
        "password": process.env.METABASE_PASSWORD
    })
}

export const loadTable = async(sessionId, database, table, field, value) => {
    database = parseInt(database)
    table = parseInt(table)
    field = parseInt(field)

    const params = {
        "type": "query",
        "query": {
            "source-table": table,
        },
        "database": database,
        "parameters": []
    }

    if (field && value)
        if (value instanceof Array)
            params.query.filter = [
                "=", [
                    "field",
                    field,
                    null
                ],
                ...value
            ]
        else
            params.query.filter = [
                "=", [
                    "field",
                    field,
                    null
                ],
                value
            ]

    const url = `${process.env.METABASE_API_URL}/dataset`
        // console.log('url', url)
        // console.log('params', JSON.stringify(params))
        // console.log('sessionId', sessionId)
    const result = await Fetcher.post(url, params, {
        headers: {
            "X-Metabase-Session": sessionId,
            "Content-Type": "application/json"
        }
    })
    const records = result.data.rows.map(row => result.data.cols.reduce((prev, cur, i) => ({...prev, [cur.display_name]: row[i] }), {}))
        // console.log(records)
    return records
}