import { TestBed } from '@angular/core/testing';

import { TravelService } from './travel.service';

describe('TravelService', () => {
  let service: TravelService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TravelService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

getCurrentLocation(): Promise<any> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject('Geolocation is not supported by your browser');
    } else {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => reject(error)
      );
    }
  });
}