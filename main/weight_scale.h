#ifndef WEIGTH_SCALE_H
#define WEIGTH_SCALE_H

bool weight_interface_init();
bool weight_interface_need_calibration();
bool measure_weight(float *measure, int32_t *raw_measure, unsigned int times);

#endif // WEIGTH_SCALE_H
