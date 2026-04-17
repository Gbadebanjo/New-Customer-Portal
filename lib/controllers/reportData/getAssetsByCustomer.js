'use server'
import db from '@/database/models';
import { ServiceConstants } from '@/utils/constants';
import { Op } from 'sequelize';

export default async function getAssetsByCustomer(customerId) {
  try {
    // Find the first user with this customer ID who has an ammp_api_key
    const user = await db.User.findOne({
      where: {
        customer: customerId,
        ammp_api_key: { [Op.ne]: null },
      },
      attributes: ['ammp_api_key'],
      raw: true,
    });

    // Use user's key if found, otherwise fall back to global AMMP_API_KEY
    const apiKey = user?.ammp_api_key || ServiceConstants.AmmpApiKiey;
    console.log('user?.ammp_api_key', user?.ammp_api_key)
    console.log(`apiKey used for customer ${customerId}: ${apiKey}`);
    if (!apiKey) {
      return { assets: [], error: 'No AMMP API key available' };
    }

    const baseUrl = ServiceConstants.AmmpServerBaseUrl;

    // Get token using the ammp_api_key
    const tokenResponse = await fetch(`${baseUrl}/v1/token`, {
      cache: 'no-store',
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });

    const tokenData = await tokenResponse.json();
    if (!tokenData.access_token) {
      return { assets: [], error: 'Failed to authenticate with AMMP' };
    }

    // Fetch assets using the token
    const assetsResponse = await fetch(`${baseUrl}/v1/assets`, {
      cache: 'no-store',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    });

    const assets = await assetsResponse.json();
    return { assets: Array.isArray(assets) ? assets : [], error: null };
  } catch (error) {
    console.error('Error fetching assets by customer:', error);
    return { assets: [], error: error.message };
  }
}
