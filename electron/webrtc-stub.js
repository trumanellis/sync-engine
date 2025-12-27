/**
 * Stub for @libp2p/webrtc
 * We don't use WebRTC transport (TCP-only), but some libp2p code tries to import it
 */

module.exports = {
  webRTC: () => {
    throw new Error('@libp2p/webrtc is not available (using TCP transport only)');
  },
};
