package com.medisync.config;

import com.medisync.model.enums.PatientCategory;
import com.medisync.model.enums.Role;
import com.medisync.model.sql.Doctor;
import com.medisync.model.sql.Patient;
import com.medisync.model.sql.Room;
import com.medisync.model.sql.User;
import com.medisync.repository.sql.DoctorRepository;
import com.medisync.repository.sql.PatientRepository;
import com.medisync.repository.sql.RoomRepository;
import com.medisync.repository.sql.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class DataInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final DoctorRepository doctorRepository;
    private final PatientRepository patientRepository;
    private final RoomRepository roomRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) {
        ensureUser("Admin", "MediSync", "admin@medisync.com", "admin123", Role.ADMIN);
        ensureUser("Salma", "Accueil", "secretary@medisync.com", "secretary123", Role.SECRETARY);
        User doctorUser = ensureUser("Sara", "Benali", "doctor@medisync.com", "doctor123", Role.DOCTOR);
        User patientUser = ensureUser("Hamza", "Benkirane", "patient@medisync.ma", "password", Role.PATIENT);

        if (doctorRepository.findById(doctorUser.getId()).isEmpty()) {
            Doctor doctor = new Doctor();
            doctor.setUser(doctorUser);
            doctor.setSpecialty("Cardiologie");
            doctor.setBio("Suivi cardiovasculaire et prevention.");
            doctor.setSpokenLanguages("Francais, Arabe, Anglais");
            doctor.setStandardConsultationRate(450.0);
            doctorRepository.save(doctor);
        }

        if (patientRepository.findById(patientUser.getId()).isEmpty()) {
            Patient patient = new Patient();
            patient.setUser(patientUser);
            patient.setFirstName(patientUser.getFirstname());
            patient.setLastName(patientUser.getLastname());
            patient.setPhoneNumber("+212 6 12 34 56 78");
            patient.setSocialSecurityNumber("MS-0001");
            patient.setCategory(PatientCategory.ADULT);
            patient.setCompanyName("Individuel");
            patientRepository.save(patient);
        }

        ensureRoom("A-204", "ECG, monitoring");
        ensureRoom("B-112", "Generaliste");
        ensureRoom("C-018", "Pediatrie");

        System.out.println("Demo accounts: admin@medisync.com/admin123, secretary@medisync.com/secretary123, doctor@medisync.com/doctor123, patient@medisync.ma/password");
    }

    private User ensureUser(String firstname, String lastname, String email, String password, Role role) {
        return userRepository.findByEmail(email).orElseGet(() ->
            userRepository.save(User.builder()
                .firstname(firstname)
                .lastname(lastname)
                .email(email)
                .password(passwordEncoder.encode(password))
                .role(role)
                .build())
        );
    }

    private void ensureRoom(String roomNumber, String equipmentType) {
        if (roomRepository.findByRoomNumber(roomNumber).isPresent()) {
            return;
        }

        Room room = new Room();
        room.setRoomNumber(roomNumber);
        room.setEquipmentType(equipmentType);
        roomRepository.save(room);
    }
}
