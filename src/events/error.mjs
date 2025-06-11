import log from '../log.mjs';

// Event handler for error
export default async function (error) {
    log.error('error', error);
}
