# For more information about build system see
# https://docs.espressif.com/projects/esp-idf/en/latest/api-guides/build-system.html
# The following five lines of boilerplate have to be in your project's
# CMakeLists in this exact order for cmake to work correctly
cmake_minimum_required(VERSION 3.16)

include($ENV{IDF_PATH}/tools/cmake/project.cmake)
project(autobar3)

idf_build_set_property(MINIMAL_BUILD ON)

# Create merged firmware binary in static/firmware/
idf_build_get_property(build_dir BUILD_DIR)
set(out_path "${CMAKE_SOURCE_DIR}/static/firmware")

# Create output directory if it doesn't exist
file(MAKE_DIRECTORY ${out_path})

# Create a custom target for generating the binary from the ELF file
add_custom_target(generate_binary
    DEPENDS ${PROJECT_NAME}.elf
    COMMAND ${CMAKE_COMMAND} -E echo "Generating binary from ELF..."
    COMMAND esptool.py --chip esp32 elf2image ${build_dir}/${PROJECT_NAME}.elf
    COMMENT "Generating binary image from built executable"
)

# Copy application binary for OTA updates
add_custom_command(
    OUTPUT ${out_path}/${PROJECT_NAME}.bin
    DEPENDS generate_binary
    COMMAND ${CMAKE_COMMAND} -E echo "Copying application binary for OTA..."
    COMMAND ${CMAKE_COMMAND} -E copy ${build_dir}/${PROJECT_NAME}.bin ${out_path}/${PROJECT_NAME}.bin
    COMMENT "Copying application binary for OTA updates"
)

# Create merged binary using esptool.py
add_custom_command(
    OUTPUT ${out_path}/merged-firmware-esp32.bin
    DEPENDS bootloader partition-table generate_binary
    COMMAND ${CMAKE_COMMAND} -E echo "Creating merged firmware binary..."
    COMMAND ${CMAKE_COMMAND} -E sleep 1
    COMMAND esptool.py --chip esp32 merge_bin 
            -o ${out_path}/merged-firmware-esp32.bin
            --flash_mode dio
            --flash_size 2MB
            --flash_freq 40m
            0x1000 ${build_dir}/bootloader/bootloader.bin
            0x8000 ${build_dir}/partition_table/partition-table.bin
            0x10000 ${build_dir}/${PROJECT_NAME}.bin
    COMMENT "Creating merged firmware binary"
)

add_custom_target(merged_binary ALL DEPENDS ${out_path}/merged-firmware-esp32.bin ${out_path}/${PROJECT_NAME}.bin)
