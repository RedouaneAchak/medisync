package com.medisync.service;

import com.medisync.model.sql.MedicalAct;
import com.medisync.repository.sql.MedicalActRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class MedicalActService {

    private final MedicalActRepository medicalActRepository;

    public List<MedicalAct> getAll(String q) {
        ensureDefaults();
        String normalized = q == null || q.isBlank() ? null : q.trim();
        return medicalActRepository.search(normalized);
    }

    public MedicalAct getById(Long id) {
        ensureDefaults();
        return medicalActRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Acte médical introuvable : " + id));
    }

    @Transactional
    public MedicalAct create(MedicalAct act) {
        ensureDefaults();
        String code = normalizeCode(act.getCode());
        if (medicalActRepository.findByCodeIgnoreCase(code).isPresent()) {
            throw new RuntimeException("Code acte déjà utilisé : " + code);
        }
        validateDuration(act.getDurationMinutes());
        act.setCode(code);
        act.setLabel(requiredText(act.getLabel(), "Libellé acte requis."));
        act.setCategory(blankToDefault(act.getCategory(), "Consultation"));
        act.setSector(blankToDefault(act.getSector(), "SECTEUR_1"));
        act.setBaseTariff(act.getBaseTariff() == null ? 0d : act.getBaseTariff());
        return medicalActRepository.save(act);
    }

    @Transactional
    public MedicalAct update(Long id, MedicalAct incoming) {
        MedicalAct existing = getById(id);
        String code = normalizeCode(incoming.getCode());
        medicalActRepository.findByCodeIgnoreCase(code)
                .filter(item -> !item.getId().equals(id))
                .ifPresent(item -> {
                    throw new RuntimeException("Code acte déjà utilisé : " + code);
                });

        validateDuration(incoming.getDurationMinutes());
        existing.setCode(code);
        existing.setLabel(requiredText(incoming.getLabel(), "Libellé acte requis."));
        existing.setCategory(blankToDefault(incoming.getCategory(), "Consultation"));
        existing.setSector(blankToDefault(incoming.getSector(), "SECTEUR_1"));
        existing.setDurationMinutes(incoming.getDurationMinutes());
        existing.setBaseTariff(incoming.getBaseTariff() == null ? 0d : incoming.getBaseTariff());
        existing.setDescription(incoming.getDescription());
        return medicalActRepository.save(existing);
    }

    @Transactional
    public void delete(Long id) {
        medicalActRepository.deleteById(id);
    }

    private void ensureDefaults() {
        if (medicalActRepository.count() > 0) {
            return;
        }
        createDefault("CONS-15", "Consultation rapide", "Consultation", "SECTEUR_1", 15, 200d, "Consultation rapide ou contrôle simple.");
        createDefault("CONS-30", "Consultation générale", "Consultation", "SECTEUR_1", 30, 300d, "Consultation standard en cabinet.");
        createDefault("SUIVI-30", "Suivi chronique", "Suivi", "SECTEUR_1", 30, 250d, "Suivi de traitement ou de pathologie chronique.");
        createDefault("URG-60", "Urgence", "Urgence", "SECTEUR_2", 60, 450d, "Prise en charge urgente avec priorité élevée.");
        createDefault("PED-30", "Consultation pédiatrique", "Pédiatrie", "SECTEUR_1", 30, 320d, "Consultation adaptée à l’enfant.");
    }

    private void createDefault(String code, String label, String category, String sector, int durationMinutes, double baseTariff, String description) {
        MedicalAct act = new MedicalAct();
        act.setCode(code);
        act.setLabel(label);
        act.setCategory(category);
        act.setSector(sector);
        act.setDurationMinutes(durationMinutes);
        act.setBaseTariff(baseTariff);
        act.setDescription(description);
        medicalActRepository.save(act);
    }

    private void validateDuration(Integer durationMinutes) {
        if (durationMinutes == null || !List.of(15, 30, 60).contains(durationMinutes)) {
            throw new RuntimeException("La durée d'un acte doit être de 15, 30 ou 60 minutes.");
        }
    }

    private String normalizeCode(String value) {
        return requiredText(value, "Code acte requis.").trim().toUpperCase();
    }

    private String requiredText(String value, String message) {
        if (value == null || value.isBlank()) {
            throw new RuntimeException(message);
        }
        return value.trim();
    }

    private String blankToDefault(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value.trim();
    }
}
