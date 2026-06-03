package com.medisync.service;

import com.medisync.dto.MedicationSuggestionDto;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class MedicationCatalogService {

    private final List<MedicationSuggestionDto> catalog = List.of(
            MedicationSuggestionDto.builder().name("Paracétamol").form("Comprimé").commonDosage("500 mg").frequencyHint("1 comprimé toutes les 6 à 8 heures").build(),
            MedicationSuggestionDto.builder().name("Amoxicilline").form("Gélule").commonDosage("1 g").frequencyHint("2 prises par jour").build(),
            MedicationSuggestionDto.builder().name("Ibuprofène").form("Comprimé").commonDosage("400 mg").frequencyHint("1 comprimé après repas").build(),
            MedicationSuggestionDto.builder().name("Oméprazole").form("Gélule").commonDosage("20 mg").frequencyHint("1 prise le matin").build(),
            MedicationSuggestionDto.builder().name("Metformine").form("Comprimé").commonDosage("850 mg").frequencyHint("1 à 2 prises par jour").build(),
            MedicationSuggestionDto.builder().name("Amlodipine").form("Comprimé").commonDosage("5 mg").frequencyHint("1 prise quotidienne").build(),
            MedicationSuggestionDto.builder().name("Ventoline").form("Inhalateur").commonDosage("100 µg").frequencyHint("1 à 2 bouffées si besoin").build(),
            MedicationSuggestionDto.builder().name("Augmentin").form("Comprimé").commonDosage("1 g").frequencyHint("2 prises par jour").build()
    );

    public List<MedicationSuggestionDto> search(String q) {
        String normalized = q == null ? "" : q.trim().toLowerCase();
        return catalog.stream()
                .filter(item -> normalized.isBlank()
                        || item.getName().toLowerCase().contains(normalized)
                        || item.getForm().toLowerCase().contains(normalized))
                .limit(8)
                .toList();
    }
}
