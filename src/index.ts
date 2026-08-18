import { WhaleCompanionService } from './host/service.ts'

export { WhaleCompanionService } from './host/service.ts'

/** Let Cordis own the service lifecycle so Service.init opens durable memory. */
export default WhaleCompanionService
