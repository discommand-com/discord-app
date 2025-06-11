import log from '../log.mjs';

// Event handler for warn
export default async function (warning) {
    log.warn('warn', { warning });
}
