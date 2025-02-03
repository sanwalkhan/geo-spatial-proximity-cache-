'use server';
import axios from 'axios';


// export interface Property {
//   property_id: number;
//   location_id: number;
//   page_url: string;
//   property_type: 'Flat' | 'House' | 'Plot' | 'Commercial';
//   price: number;
//   place: string;
//   city: string;
//   province_name: string;
//   latitude: number;
//   longitude: number;
//   location: {
//     type: 'Point';
//     coordinates: [number, number];
//   };
//   baths: number;
//   area: string;
//   purpose: 'For Sale' | 'For Rent';
//   bedrooms: number;
//   date_added: string;
//   area_type: string;
//   area_size: number;
//   area_category: string;
// }

export interface Property {
  _id: string;
  id: number;
  name: string;
  host_id: number;
  host_identity_verified: "confirmed" | "unconfirmed";
  host_name: string;
  neighbourhood_group: string;
  neighbourhood: string;
  location: {
    type: "Point";
    coordinates: [number, number]; // [longitude, latitude]
  };
  country: string;
  country_code: string;
  instant_bookable: boolean;
  cancellation_policy: string;
  room_type: string;
  construction_year: number;
  price: string;
  service_fee: string;
  minimum_nights: number;
  number_of_reviews: number;
  last_review: string;
  reviews_per_month: number;
  review_rate_number: number;
  calculated_host_listings_count: number;
  availability_365: number;
  house_rules: string;
}

export interface PropertyResponse {
  properties: Property[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
}


export async function createProperty(data: Property) {
  try {
    const response = await axios.post(`${process.env.API_URL}/api/v1/properties`, data);
    return response.data;
  } catch (error) {
    throw new Error('Failed to create property');
  }
}

export async function getProperties(
  lat: number,
  lng: number,
  page = 1,
  limit = 50,
): Promise<{
  properties: Property[]
  hasMore: boolean
  totalCount: number
}> {
  try {
    const response = await axios.get(
      `${process.env.API_URL}/api/v1/properties/nearby?lat=${lat}&lng=${lng}&radius=1000&page=${page}&limit=${limit}`,
    )
    // console.log(response.data, 'response');

    return {
      properties: response.data.properties || [],
      hasMore: response.data.hasMore || false,
      totalCount: response.data.totalCount || 0,
    }
  } catch (error) {
    throw new Error("Failed to fetch properties")
  }
}



export async function getPropertyById(id: string): Promise<Property> {
  try {
    const response = await axios.get(`${process.env.API_URL}/properties/${id}`);
    return response.data;
  } catch (error) {
    throw new Error('Failed to fetch property');
  }
}


export async function getStats(hostIdentityVerified?: string) {
  try {
    const url = new URL(`${process.env.API_URL}/api/v1/properties/aggregate`);

    // Add hostIdentityVerified to the URL only if it is provided and not 'all'
    if (hostIdentityVerified && hostIdentityVerified !== "all") {
      url.searchParams.append("hostIdentityVerified", hostIdentityVerified);
    }

    const response = await axios.get(url.toString());
    return response.data;
  } catch (error) {
    throw new Error("Failed to fetch stats");
  }
}
