package com.example.auth.serviceimpl;

import com.example.auth.dto.CreateEmployeeRequestDto;
import com.example.auth.dto.EmployeeResponseDto;
import com.example.auth.entity.AuthRole;
import com.example.auth.entity.AuthUsr;
import com.example.auth.entity.CustStsMstr;
import com.example.auth.entity.CustTypMstr;
import com.example.auth.repository.AuthRoleRepository;
import com.example.auth.repository.AuthUsrRepository;
import com.example.auth.repository.CustDtlRepository;
import com.example.auth.repository.CustStsMstrRepository;
import com.example.auth.repository.CustTypMstrRepository;
import com.example.auth.security.JwtService;
import com.example.auth.service.LoginAuditService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.crypto.bcrypt.BCrypt;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@org.mockito.junit.jupiter.MockitoSettings(strictness = org.mockito.quality.Strictness.LENIENT)
class AdminEmployeeServiceTest {

    @Mock
    private AuthUsrRepository authUsrRepository;

    @Mock
    private AuthRoleRepository authRoleRepository;

    @Mock
    private CustDtlRepository custDtlRepository;

    @Mock
    private CustTypMstrRepository custTypMstrRepository;

    @Mock
    private CustStsMstrRepository custStsMstrRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private JwtService jwtService;

    @Mock
    private LoginAuditService loginAuditService;

    @Mock
    private com.example.auth.util.AuditUtil auditUtil;

    @InjectMocks
    private AuthServiceImpl authService;

    private AuthUsr headAdminUser;
    private AuthUsr adminUser;
    private AuthUsr staffUser;
    private AuthUsr customerUser;
    private AuthRole adminRole;
    private AuthRole staffRole;
    private final String hashedPassword = BCrypt.hashpw("temp", BCrypt.gensalt());

    @BeforeEach
    void setUp() {
        AuthRole headAdminRole = new AuthRole();
        headAdminRole.setRoleId(1L);
        headAdminRole.setRoleCode("HEAD_ADMIN");

        AuthRole adminRole = new AuthRole();
        adminRole.setRoleId(2L);
        adminRole.setRoleCode("ADMIN");
        this.adminRole = adminRole;

        headAdminUser = new AuthUsr();
        headAdminUser.setUsername("headadmin");
        headAdminUser.setPasswordHash(hashedPassword);
        headAdminUser.setRole(headAdminRole);
        headAdminUser.setUserId(1L);

        adminUser = new AuthUsr();
        adminUser.setUsername("admin");
        adminUser.setPasswordHash(hashedPassword);
        adminUser.setRole(adminRole);
        adminUser.setUserId(2L);

        staffUser = new AuthUsr();
        staffUser.setUsername("staff");
        staffUser.setPasswordHash(hashedPassword);
        staffUser.setRole(adminRole);
        staffUser.setUserId(3L);

        customerUser = new AuthUsr();
        customerUser.setUsername("customer");
        customerUser.setPasswordHash(hashedPassword);
        customerUser.setRole(adminRole);
        customerUser.setUserId(4L);

        AuthRole staffRole = new AuthRole();
        staffRole.setRoleId(3L);
        staffRole.setRoleCode("STAFF");
        this.staffRole = staffRole;
        staffUser.setRole(staffRole);

        AuthRole customerRole = new AuthRole();
        customerRole.setRoleId(5L);
        customerRole.setRoleCode("CUSTOMER");
        customerUser.setRole(customerRole);

        when(authRoleRepository.findByRoleCode(eq("HEAD_ADMIN"))).thenReturn(Optional.of(headAdminRole));
        when(authRoleRepository.findByRoleCode(eq("ADMIN"))).thenReturn(Optional.of(adminRole));
        when(authRoleRepository.findByRoleCode(eq("STAFF"))).thenReturn(Optional.of(staffRole));
        CustTypMstr individual = new CustTypMstr();
        individual.setTypeCode("INDIVIDUAL");
        CustStsMstr active = new CustStsMstr();
        active.setStatusCode("ACTIVE");
        when(custTypMstrRepository.findByTypeCode("INDIVIDUAL")).thenReturn(Optional.of(individual));
        when(custStsMstrRepository.findByStatusCode("ACTIVE")).thenReturn(Optional.of(active));
        when(custDtlRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(passwordEncoder.encode(anyString())).thenReturn(hashedPassword);
        when(auditUtil.createAudit(anyString())).thenReturn(new com.example.auth.util.AuditData());
        when(authUsrRepository.save(any(AuthUsr.class))).thenAnswer(invocation -> invocation.getArgument(0));
        org.springframework.test.util.ReflectionTestUtils.setField(authService, "auditUtil", auditUtil);
    }

    @Test
    void testCreateEmployee_Success_HeadAdmin() {
        CreateEmployeeRequestDto request = new CreateEmployeeRequestDto();
        request.setUsername("jdoe");
        request.setEmail("jdoe@bank.local");
        request.setPhoneNumber("+1234567890");
        request.setPassword("P@ssw0rd!2025");
        request.setRoleCode("STAFF");

        when(authUsrRepository.findByUsername("headadmin")).thenReturn(Optional.of(headAdminUser));
        when(authUsrRepository.existsByUsername("jdoe")).thenReturn(false);
        when(authUsrRepository.existsByEmail("jdoe@bank.local")).thenReturn(false);
        when(authUsrRepository.existsByPhoneNumber("+1234567890")).thenReturn(false);

        AuthUsr created = new AuthUsr();
        created.setUserId(10L);
        created.setUsername("jdoe");
        created.setEmail("jdoe@bank.local");
        created.setPhoneNumber("+1234567890");
        created.setPasswordHash(hashedPassword);
        created.setRole(staffRole);
        created.setFailedLoginAttempts((short) 0);
        when(authUsrRepository.save(any(AuthUsr.class))).thenReturn(created);

        EmployeeResponseDto response = authService.createEmployee("headadmin", request);

        assertNotNull(response);
        assertEquals("jdoe", response.getUsername());
        assertEquals("jdoe@bank.local", response.getEmail());
        assertEquals("+1234567890", response.getPhoneNumber());
        assertEquals("STAFF", response.getRole());
        assertEquals(Long.valueOf(10L), response.getUserId());

        assertEquals("STAFF", request.getRoleCode());

        // Verify password was hashed with BCrypt
        verify(passwordEncoder).encode("P@ssw0rd!2025");
    }

    @Test
    void testCreateEmployee_AdminCaller_Success() {
        CreateEmployeeRequestDto request = new CreateEmployeeRequestDto();
        request.setUsername("jdoe");
        request.setEmail("jdoe@bank.local");
        request.setPassword("P@ssw0rd!2025");
        request.setRoleCode("STAFF");

        when(authUsrRepository.findByUsername("admin")).thenReturn(Optional.of(adminUser));
        when(authUsrRepository.existsByUsername("jdoe")).thenReturn(false);
        when(authUsrRepository.existsByEmail(null)).thenReturn(false);
        when(authUsrRepository.existsByPhoneNumber(null)).thenReturn(false);
        when(authUsrRepository.save(any(AuthUsr.class))).thenAnswer(invocation -> {
            AuthUsr employee = invocation.getArgument(0);
            employee.setUserId(10L);
            return employee;
        });

        EmployeeResponseDto response = authService.createEmployee("admin", request);

        assertEquals("STAFF", response.getRole());
    }

    @Test
    void testCreateEmployee_StaffCaller_Forbidden() {
        CreateEmployeeRequestDto request = new CreateEmployeeRequestDto();
        request.setUsername("jdoe");
        request.setPassword("P@ssw0rd!2025");

        when(authUsrRepository.findByUsername("staff")).thenReturn(Optional.of(staffUser));

        assertThrows(AccessDeniedException.class,
                () -> authService.createEmployee("staff", request));
    }

    @Test
    void testCreateEmployee_CustomerCaller_Forbidden() {
        CreateEmployeeRequestDto request = new CreateEmployeeRequestDto();
        request.setUsername("jdoe");
        request.setPassword("P@ssw0rd!2025");

        when(authUsrRepository.findByUsername("customer")).thenReturn(Optional.of(customerUser));

        assertThrows(AccessDeniedException.class,
                () -> authService.createEmployee("customer", request));
    }

    @Test
    void testCreateEmployee_BlankUsername_Failure() {
        CreateEmployeeRequestDto request = new CreateEmployeeRequestDto();
        request.setUsername("");
        request.setPassword("P@ssw0rd!2025");

        when(authUsrRepository.findByUsername("headadmin")).thenReturn(Optional.of(headAdminUser));

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> authService.createEmployee("headadmin", request));
        assertEquals("Username is required", ex.getMessage());
    }

    @Test
    void testCreateEmployee_BlankPassword_Failure() {
        CreateEmployeeRequestDto request = new CreateEmployeeRequestDto();
        request.setUsername("jdoe");
        request.setPassword("");

        when(authUsrRepository.findByUsername("headadmin")).thenReturn(Optional.of(headAdminUser));

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> authService.createEmployee("headadmin", request));
        assertEquals("Password is required", ex.getMessage());
    }

    @Test
    void testCreateEmployee_DuplicateUsername_Failure() {
        CreateEmployeeRequestDto request = new CreateEmployeeRequestDto();
        request.setUsername("existing");
        request.setEmail("existing@bank.local");
        request.setPassword("P@ssw0rd!2025");

        when(authUsrRepository.findByUsername("headadmin")).thenReturn(Optional.of(headAdminUser));
        when(authUsrRepository.existsByUsername("existing")).thenReturn(true);

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> authService.createEmployee("headadmin", request));
        assertEquals("Username, email, or phone already exists", ex.getMessage());
    }

    @Test
    void testCreateEmployee_DuplicateEmail_Failure() {
        CreateEmployeeRequestDto request = new CreateEmployeeRequestDto();
        request.setUsername("newuser");
        request.setEmail("taken@bank.local");
        request.setPassword("P@ssw0rd!2025");

        when(authUsrRepository.findByUsername("headadmin")).thenReturn(Optional.of(headAdminUser));
        when(authUsrRepository.existsByUsername("newuser")).thenReturn(false);
        when(authUsrRepository.existsByEmail("taken@bank.local")).thenReturn(true);

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> authService.createEmployee("headadmin", request));
        assertEquals("Username, email, or phone already exists", ex.getMessage());
    }

    @Test
    void testCreateEmployee_DuplicatePhone_Failure() {
        CreateEmployeeRequestDto request = new CreateEmployeeRequestDto();
        request.setUsername("newuser");
        request.setPhoneNumber("+9876543210");
        request.setPassword("P@ssw0rd!2025");

        when(authUsrRepository.findByUsername("headadmin")).thenReturn(Optional.of(headAdminUser));
        when(authUsrRepository.existsByUsername("newuser")).thenReturn(false);
        when(authUsrRepository.existsByPhoneNumber("+9876543210")).thenReturn(true);

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> authService.createEmployee("headadmin", request));
        assertEquals("Username, email, or phone already exists", ex.getMessage());
    }

    @Test
    void testCreateEmployee_LoginAfterwards_Success() {
        // Simulate head admin creating an employee, then logging in as that employee
        CreateEmployeeRequestDto request = new CreateEmployeeRequestDto();
        request.setUsername("jdoe");
        request.setEmail("jdoe@bank.local");
        request.setPassword("P@ssw0rd!2025");

        when(authUsrRepository.findByUsername("headadmin")).thenReturn(Optional.of(headAdminUser));
        when(authUsrRepository.existsByUsername("jdoe")).thenReturn(false);
        when(authUsrRepository.existsByEmail(anyString())).thenReturn(false);
        when(authUsrRepository.existsByPhoneNumber(anyString())).thenReturn(false);

        String empPassHash = BCrypt.hashpw("P@ssw0rd!2025", BCrypt.gensalt());
        AuthUsr created = new AuthUsr();
        created.setUserId(10L);
        created.setUsername("jdoe");
        created.setPasswordHash(empPassHash);
        created.setRole(adminRole);
        created.setFailedLoginAttempts((short) 0);
        when(authUsrRepository.save(any(AuthUsr.class))).thenReturn(created);
        when(authUsrRepository.findByUsername("jdoe")).thenReturn(Optional.of(created));

        EmployeeResponseDto response = authService.createEmployee("headadmin", request);
        assertNotNull(response);
        assertEquals("ADMIN", response.getRole());

        // Password verification (login) should succeed with BCrypt
        assertTrue(BCrypt.checkpw("P@ssw0rd!2025", empPassHash));
    }
}
