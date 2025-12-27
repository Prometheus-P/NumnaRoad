
import {
  BaseProvider,
  EsimPurchaseRequest,
  EsimPurchaseResult,
  registerProvider,
} from './provider-factory';
import { ProviderSlug, ErrorType, AiraloPackageResponse, AiraloPackageData, AiraloOperator, AiraloPackageDetails, EsimProduct, AiraloOrderResponse, AiraloSimInstructionsResponse } from './types';

export class AiraloProvider extends BaseProvider {
  readonly slug: ProviderSlug = 'airalo';
  private accessToken: string | null = null;
  private tokenExpiry: number | null = null;

  private get apiUrl(): string {
    return this.config.apiEndpoint || process.env.AIRALO_API_URL || 'https://sandbox-partners-api.airalo.com/v2';
  }

  private get tokenUrl(): string {
    // OAuth token endpoint is at root level, not under /v2
    const baseUrl = this.apiUrl.replace(/\/v2\/?$/, '');
    return `${baseUrl}/token`;
  }

  private async getAccessToken(): Promise<string> {
    if (this.accessToken && this.tokenExpiry && this.tokenExpiry > Date.now()) {
      return this.accessToken;
    }

    const formData = new FormData();
    formData.append('grant_type', 'client_credentials');
    formData.append('client_id', this.loadApiKey()); // Assuming loadApiKey returns client_id
    formData.append('client_secret', process.env.AIRALO_API_SECRET_KEY as string);

    const response = await this.fetchWithTimeout(this.tokenUrl, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
      },
      body: formData,
    });

    if (!response.ok) {
        throw new Error('Failed to get access token from Airalo API');
    }

    const data = await response.json();

    if (!data.access_token) {
      throw new Error('Failed to get access token from Airalo API');
    }

    this.accessToken = data.access_token;
    this.tokenExpiry = Date.now() + (data.expires_in - 60) * 1000; // 60 seconds buffer

    return data.access_token;
  }

  async purchase(request: EsimPurchaseRequest): Promise<EsimPurchaseResult> {
    try {
      const accessToken = await this.getAccessToken();

      const formData = new FormData();
      formData.append('package_id', request.providerSku);
      formData.append('quantity', request.quantity.toString());
      formData.append('type', 'sim'); // As per OpenAPI spec
      formData.append('description', `Order for ${request.customerEmail}, SKU: ${request.providerSku}`);
      formData.append('brand_settings_name', ''); // Can be null, sending empty string as per example for unbranded

      const response = await this.fetchWithTimeout(`${this.apiUrl}/orders`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: formData,
      });

      if (!response.ok) {
        return this.handleErrorResponse(response);
      }

      const data: AiraloOrderResponse = await response.json();

      if (!data.data || !data.data.sims || data.data.sims.length === 0) {
        return {
          success: false,
          errorType: 'provider_error',
          errorMessage: data.meta?.message ?? 'Purchase failed: No eSIM data returned',
          isRetryable: false,
        };
      }

      // Assuming we only order 1 SIM at a time for now based on context
      const esim = data.data.sims[0];

      return {
        success: true,
        qrCodeUrl: esim.qrcode_url,
        iccid: esim.iccid,
        activationCode: esim.lpa || esim.qrcode, // Fallback to qrcode if lpa is not present
        providerOrderId: data.data.id.toString(), // The order ID from Airalo
        directAppleInstallationUrl: esim.direct_apple_installation_url,
      };
    } catch (error) {
      return this.handleException(error);
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.getAccessToken();
      return true;
    } catch (error) {
      return false;
    }
  }

  async getPackages(): Promise<AiraloPackageResponse> {
    try {
      const accessToken = await this.getAccessToken();

      const response = await this.fetchWithTimeout(`${this.apiUrl}/packages?limit=1000`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        throw new Error(`Failed to fetch Airalo packages: HTTP ${response.status} - ${errorBody.meta?.message || response.statusText}`);
      }

      return response.json();
    } catch (error) {
      console.error('Error fetching Airalo packages:', error);
      throw error;
    }
  }

  async syncProducts(providerId: string): Promise<EsimProduct[]> {
    try {
      const airaloPackageResponse = await this.getPackages();
      let allEsimProducts: EsimProduct[] = [];

      for (const airaloPackage of airaloPackageResponse.data) {
        const esimProducts = this.transformAiraloPackageToEsimProducts(airaloPackage, providerId);
        allEsimProducts = allEsimProducts.concat(esimProducts);
      }

      return allEsimProducts;
    } catch (error) {
      console.error('Error syncing Airalo products:', error);
      throw error;
    }
  }

  async getSimInstructions(simId: string): Promise<AiraloSimInstructionsResponse> {
    try {
      const accessToken = await this.getAccessToken();

      const response = await this.fetchWithTimeout(`${this.apiUrl}/sims/${simId}/instructions`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        throw new Error(`Failed to fetch Airalo SIM instructions: HTTP ${response.status} - ${errorBody.meta?.message || response.statusText}`);
      }

      return response.json();
    } catch (error) {
      console.error('Error fetching Airalo SIM instructions:', error);
      throw error;
    }
  }

  private transformAiraloPackageToEsimProducts(
    airaloPackage: AiraloPackageData,
    providerId: string,
  ): EsimProduct[] {
    const esimProducts: EsimProduct[] = [];

    airaloPackage.operators.forEach((operator: AiraloOperator) => {
      operator.packages.forEach((pkg: AiraloPackageDetails) => {
        const dataMatch = pkg.data.match(/(\d+)\s*([a-zA-Z]+)/);
        let dataAmount: number = 0;
        let dataUnit: string = 'GB'; // Default to GB

        if (dataMatch) {
          dataAmount = parseInt(dataMatch[1], 10);
          dataUnit = dataMatch[2].toUpperCase(); // e.g., "GB", "MB"
        }

        esimProducts.push({
          id: `${providerId}-${pkg.id}`, // Generate a unique ID
          name: `${airaloPackage.title} - ${pkg.title}`,
          slug: airaloPackage.slug,
          country: airaloPackage.country_code,
          providerId: providerId,
          providerSku: operator.id.toString(), // Operator ID as SKU
          providerPackageId: pkg.id, // Airalo's specific package ID
          price: pkg.prices.net_price.USD || pkg.price, // Use USD net price if available, otherwise general price
          dataAmount: dataAmount,
          dataUnit: dataUnit,
          durationDays: pkg.day,
          isActive: true, // Assuming all fetched packages are active
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      });
    });

    return esimProducts;
  }

  private async handleErrorResponse(
    response: Response
  ): Promise<EsimPurchaseResult> {
    const errorType = this.classifyHttpError(response.status);
    let errorMessage = `HTTP ${response.status}`;

    try {
      const body = (await response.json()) as { error?: { message?: string } };
      errorMessage = body.error?.message ?? errorMessage;
    } catch {
      // Ignore JSON parse errors
    }

    return {
      success: false,
      errorType,
      errorMessage,
      isRetryable: this.isRetryableStatus(response.status),
    };
  }

  private handleException(error: unknown): EsimPurchaseResult {
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        return {
          success: false,
          errorType: 'timeout',
          errorMessage: `Request timed out after ${this.config.timeoutMs}ms`,
          isRetryable: true,
        };
      }

      if (error.message.includes('fetch')) {
        return {
          success: false,
          errorType: 'network_error',
          errorMessage: error.message,
          isRetryable: true,
        };
      }
    }

    return {
      success: false,
      errorType: 'unknown',
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      isRetryable: false,
    };
  }

  private classifyHttpError(status: number): ErrorType {
    if (status === 401 || status === 403) {
      return 'authentication';
    }
    if (status === 429) {
      return 'rate_limit';
    }
    if (status === 400 || status === 422) {
      return 'validation';
    }
    if (status >= 500) {
      return 'provider_error';
    }
    return 'unknown';
  }

  private isRetryableStatus(status: number): boolean {
    return status === 429 || status >= 500;
  }
}

// Register provider
registerProvider('airalo', AiraloProvider);
