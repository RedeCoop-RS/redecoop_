import { HttpService } from '@nestjs/axios';
import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';

function haversineKm(
  startLat: number,
  startLng: number,
  endLat: number,
  endLng: number,
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const lat1 = toRad(startLat);
  const lat2 = toRad(endLat);
  const dLat = lat2 - lat1;
  const dLng = toRad(endLng - startLng);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

@Injectable()
export class MapsService {
  private readonly apiUrl: string;
  private readonly accessToken: string;
  private readonly logger = new Logger(MapsService.name);

  constructor(private readonly httpService: HttpService) {
    this.apiUrl = process.env.API_MAPS;
    this.accessToken = process.env.MAPS_TOKEN;
  }

  async autoComplete(address: string) {
    const url = `${this.apiUrl}/search/geocode/v6/forward?q=${encodeURIComponent(address)}&proximity=ip&access_token=${this.accessToken}`;
    return await this.httpService.axiosRef
      .get(url)
      .then((res) =>
        res.data.features.map((feature) => {
          const {
            geometry: { coordinates },
            properties: { full_address, name, place_formatted },
          } = feature;

          return {
            name: name || place_formatted,
            address: full_address || 'Endereço não disponível',
            coordinates: {
              latitude: coordinates[1],
              longitude: coordinates[0],
            },
          };
        }),
      )
      .catch((err) => {
        throw new ServiceUnavailableException('API de consulta de endereço está indisponível');
      });
  }

  /**
   * Calcula a distância entre dois pontos (coordenadas) usando a API de rotas do Mapbox.
   *
   * @param { [number, number] } start - As coordenadas de início da rota [longitude, latitude].
   * @param { [number, number] } end - As coordenadas de destino da rota [longitude, latitude].
   * @returns { Promise<number> } - Retorna uma Promise que resolve para a distância em quilômetros entre os dois pontos.
   *
   * @throws { ServiceUnavailableException } - Lança uma exceção se houver erro ao calcular a distância, como falha na chamada à API.
   *
   * @example
   * // Exemplo de uso
   * const start = [40.748817, -73.985428]; // Coordenadas da origem
   * const end = [34.052235, -118.243683];  // Coordenadas do destino
   * const distance = await getRouteDistance(start, end);
   * console.log(`A distância é de ${distance} km`);
   */
  async getRouteDistance(start: [number, number], end: [number, number]): Promise<number> {
    const [startLng, startLat] = start;
    const [endLng, endLat] = end;

    if (!this.apiUrl || !this.accessToken) {
      return Number(haversineKm(startLat, startLng, endLat, endLng).toFixed(2));
    }

    const url = `${this.apiUrl}/directions/v5/mapbox/driving/${start.join(',')};${end.join(',')}?&access_token=${this.accessToken}`;
    try {
      const response = await firstValueFrom(this.httpService.get(url));
      return response.data.routes[0].distance / 1000;
    } catch (err) {
      this.logger.warn('Mapbox indisponível, usando distância estimada por coordenadas');
      return Number(haversineKm(startLat, startLng, endLat, endLng).toFixed(2));
    }
  }
}
