import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DossierPage } from './dossier.page';

describe('DossierPage', () => {
  let component: DossierPage;
  let fixture: ComponentFixture<DossierPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(DossierPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
