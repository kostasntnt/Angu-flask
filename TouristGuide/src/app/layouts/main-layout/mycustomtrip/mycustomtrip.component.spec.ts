import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MycustomtripComponent } from './mycustomtrip.component';

describe('MycustomtripComponent', () => {
  let component: MycustomtripComponent;
  let fixture: ComponentFixture<MycustomtripComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [MycustomtripComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MycustomtripComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
