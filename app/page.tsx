import { Container } from 'react-bootstrap'

import { assertCurrentUser } from './utils'

// export const runtime = 'edge'
export const preferredRegion = 'home'
export const dynamic = 'force-dynamic'


export default async function Home() {
  await assertCurrentUser()

  return (<>
    <Container fluid={false}>
      <h1>TRF2 - Timeline</h1>
    </Container>
  </>)
}