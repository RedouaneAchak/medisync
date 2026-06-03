package com.medisync.service;

import com.medisync.model.nosql.NotificationLog;
import com.medisync.model.sql.Appointment;
import com.medisync.repository.nosql.NotificationLogRepository;
import com.medisync.repository.sql.AppointmentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class AppointmentReminderScheduler {

    private final AppointmentRepository appointmentRepository;
    private final NotificationLogRepository notificationLogRepository;
    private final NotificationEmailService notificationEmailService;

    @Scheduled(fixedDelay = 900000)
    public void scheduleUpcomingReminders() {
        LocalDateTime now = LocalDateTime.now();
        createReminderBatch(now.plusHours(24).minusMinutes(15), now.plusHours(24).plusMinutes(15), "24H_REMINDER");
        createReminderBatch(now.plusHours(1).minusMinutes(15), now.plusHours(1).plusMinutes(15), "1H_REMINDER");
    }

    private void createReminderBatch(LocalDateTime from, LocalDateTime to, String type) {
        List<Appointment> candidates = appointmentRepository.findByDateTimeBetween(from, to);
        candidates.stream()
                .filter(appointment -> appointment.getPatient() != null)
                .filter(appointment -> appointment.getDateTime() != null)
                .filter(appointment -> !"CANCELLED".equalsIgnoreCase(appointment.getStatus()))
                .filter(appointment -> !notificationLogRepository.existsByAppointmentIdAndType(appointment.getId(), type))
                .forEach(appointment -> {
                    NotificationLog log = new NotificationLog();
                    log.setAppointmentId(appointment.getId());
                    log.setPatientId(appointment.getPatient().getId());
                    log.setType(type);
                    log.setSentAt(LocalDateTime.now());
                    notificationLogRepository.save(log);
                    notificationEmailService.sendAppointmentReminder(appointment, type);
                });
    }
}
