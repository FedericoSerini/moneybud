import Keycloak from 'keycloak-js'

const keycloak = new Keycloak({
  url: import.meta.env.VITE_KEYCLOAK_URL as string,
  realm: 'homelab',
  clientId: 'moneybud',
})

export default keycloak
