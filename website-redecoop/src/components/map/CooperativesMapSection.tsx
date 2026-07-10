import { RsMap } from './RsMap'
import '@/styles/home-map.css'

const ARROW_PATH =
  'M338.009 34.163C308.466 74.7292 252.891 114.991 174.11 109.478C101.125 104.344 44.7494 65.6818 23.9732 21.2164C23.8925 21.0495 23.7629 20.8771 23.5844 20.6995C24.6004 19.5447 13.173 14.224 14.1401 13.064C16.3939 19.1621 34.0908 28.6773 42.4951 33.7054C46.8615 36.3006 51.7884 31.9336 47.422 29.3384C36.5748 23.1268 25.9342 13.821 21.7205 3.86099C22.0031 1.26599 15.8056 -0.864258 13.7111 1.56501C12.3377 14.6573 9.14674 25.201 0.670701 34.9074C-1.92848 37.8828 4.61487 41.3796 7.89154 38.5412C11.7672 35.1987 15.2586 31.751 18.6102 28.2249C42.7885 72.3332 99.89 109.778 173.378 114.84C254.085 120.372 316.164 79.4272 342.317 35.4863C343.404 33.6749 339.083 32.4766 337.81 34.1729L338.009 34.163Z'

export function CooperativesMapSection() {
  return (
    <section className="home-map-section bg-section-map" aria-label="Mapa de cooperativas no Rio Grande do Sul">
      <div className="home-map-section__inner">
        <div className="home-map-section__layout">
          <div className="home-map-section__map">
            <RsMap size="large" />
          </div>

          <div className="home-map-section__copy">
            <div className="home-map-section__copy-inner">
              <p className="home-map-section__kicker">
                Quer saber
                <br />
                onde estamos?
              </p>

              <p className="home-map-section__title">
                <span className="home-map-section__title-red">Navegue</span>
                <br />
                <span className="home-map-section__title-green">
                  sobre{' '}
                  <span className="home-map-section__map-word">
                    <span className="home-map-section__map-word-o">o</span>
                    <span className="home-map-section__map-word-label">mapa</span>
                  </span>
                  <br />
                  e conheça mais
                  <br />
                  sobre nossas cooperativas
                  <br />
                  e centrais.
                </span>
              </p>

              <div className="home-map-section__arrow" aria-hidden="true">
                <svg width="100%" height="116" viewBox="0 0 343 116" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d={ARROW_PATH} fill="#E30613" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
